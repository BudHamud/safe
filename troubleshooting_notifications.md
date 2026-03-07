# Troubleshooting Capacitor Notification Listener Background Issue

## Context
This project is an Ionic/Capacitor application using Next.js for the frontend (`gastos-app`). We are using the plugin `@posx/capacitor-notifications-listener` (v5.0.7) to intercept bank push notifications and parse them into financial transactions.

### The Problem
When the app is in the foreground, it successfully requests the `BIND_NOTIFICATION_LISTENER_SERVICE` permission, starts the service, and correctly intercepts notifications. 

However, the user reports two critical issues:
1. **Background Death**: If the user swipes the app away from the "Recent Apps" screen (force close), the Notification Listener service stops intercepting notifications.
2. **Permission "Revocation" / Sleep state**: When the user re-opens the app after force-closing it, the app behaves as if the permission was revoked. The user is forced to go back into the Android Settings, disable the Notification Access toggle, wait 10 seconds, and re-enable it for the listener to start working again.

### What we have tried so far

#### 1. Frontend Caching
We enabled `cacheNotifications: true` in the plugin initialization (`useBankNotifications.ts`) and called `restoreCachedNotifications()` on app startup. This was intended to handle the case where the WebView dies but the native Android Service stays alive in the background caching data.

```typescript
// src/hooks/useBankNotifications.ts
const startService = async () => {
    try {
        await plugin.startListening({ packagesWhitelist: whitelist, cacheNotifications: true });
        console.warn('[BankNotif] Servicio de escucha activo.');
    } catch (e) {
        console.error('[BankNotif] Error al iniciar escucha:', e);
    }
};

const setup = async () => {
    const { value } = await plugin.isListening();
    setPermissionGranted(value);
    
    await startService();

    // Restore mapped notifications that arrived while the app was closed
    try {
        await plugin.restoreCachedNotifications();
    } catch (e) {
        console.error('[BankNotif] Error al restaurar notificaciones:', e);
    }
    // ...
```

#### 2. Native Plugin Patching (Java)
Because the app forced the user to manually reset permissions every time the app was opened from a swipe-closed state, we suspected the plugin was misinterpreting the system's granted permissions and failing to wake itself up. We used `patch-package` to modify the Java code of the plugin (`NotificationsListenerPlugin.java`).

**A. Checking actual System Registry instead of a volatile boolean:**
```java
    @PluginMethod
    public void isListening(PluginCall call) {
        JSObject ret = new JSObject();
        boolean isGranted = false;
        String packageName = getContext().getPackageName();
        String enabledListeners = Settings.Secure.getString(getContext().getContentResolver(), "enabled_notification_listeners");
        if (enabledListeners != null && enabledListeners.contains(packageName)) {
            isGranted = true;
        }
        ret.put("value", isGranted);
        call.resolve(ret);
    }
```

**B. Forcing Android to Rebind the service on startup:**
```java
    @SuppressLint("UnspecifiedRegisterReceiverFlag")
    @PluginMethod
    public void startListening(PluginCall call) throws JSONException {
        // ... parameter setup ...

        IntentFilter filter = new IntentFilter();
        filter.addAction(NotificationService.ACTION_RECEIVE);
        filter.addAction(NotificationService.ACTION_REMOVE);
        notificationReceiver = new NotificationReceiver(getContext(), filter);
        NotificationService.notificationReceiver = notificationReceiver;

        // Force Android to re-bind the NotificationListenerService specifically when app opens
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            try {
                ComponentName componentName = new ComponentName(getContext(), NotificationService.class);
                android.service.notification.NotificationListenerService.requestRebind(componentName);
                Log.d(TAG, "Requested rebind for NotificationService");
            } catch (Exception e) {
                Log.e(TAG, "Error requesting rebind: " + e.getMessage());
            }
        }

        call.resolve();
    }
```

#### 3. Battery Optimization
The user was instructed to:
1. Set the app battery usage to **"Unrestricted"**.
2. **Lock the app** in the Recents menu (padlock icon).
3. If using Xiaomi/HyperOS, enable **"Autostart"**.

**Result:** Despite these changes, the issue persisted. The service died completely and failed to re-bind gracefully. When the user opened the app, `isListening()` correctly identified that the permission was technically granted, but the service didn't actually wake up to intercept new notifications unless manually toggled off and on again in Android Settings.

---

#### 4. Foreground Service + stopWithTask + requestRebind en lugar correcto

**Diagnosis:** Three independent bugs chained together:
- `android:stopWithTask` was missing → when user swiped the app, Android killed the entire process (app + service together)
- No Foreground Service → on Xiaomi/HyperOS the OS kills background processes aggressively even with `stopWithTask="false"`
- `requestRebind()` was in the wrong place (in `startListening()`) instead of `onListenerDisconnected()`, which is the exact callback the OS fires when it loses the binding

**4a. `android:stopWithTask="false"` + `foregroundServiceType` in AndroidManifest:**
```xml
<service
    android:name="com.capacitor.notifications.listener.NotificationService"
    android:stopWithTask="false"
    android:foregroundServiceType="specialUse"
    android:exported="true"
    android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE">
    ...
</service>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
```

**4b. Foreground Service implementation in `NotificationService.java`:**
Called `startForeground()` in `onCreate()` so the OS promotes the service to a foreground service with a persistent silent notification. This prevents Xiaomi/HyperOS from killing it.
```java
private void startForegroundCompat() {
    // Create notification channel (API 26+)
    // ...
    startForeground(FOREGROUND_NOTIF_ID, notif); // or with TYPE_SPECIAL_USE on API 34+
}
```

**4c. `requestRebind()` moved to `onListenerDisconnected()`:**
```java
@Override
public void onListenerDisconnected() {
    isConnected = false;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        ComponentName cn = new ComponentName(getApplicationContext(), NotificationService.class);
        NotificationListenerService.requestRebind(cn);
    }
}
```

**Result:** The Foreground Service started (persistent notification appeared in status bar), but the NLS binding still didn't reconnect after swipe. Root cause: a crash was happening on Android 10–13 (see attempt 5).

---

#### 5. Fix Foreground Service crash (API level bug) + BootReceiver

**Diagnosis:** `FOREGROUND_SERVICE_TYPE_SPECIAL_USE` is a constant that only exists on **API 34 (Android 14+)**, but the previous check was `Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q` (API 29). This caused an `IllegalArgumentException` crash on Android 10–13 the moment `startForeground()` was called → the service crashed instantly → Android marked it as a crash-loop and stopped retrying.

**5a. Fix API check for `FOREGROUND_SERVICE_TYPE_SPECIAL_USE`:**
```java
// WRONG (crashes Android 10-13):
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
    startForeground(ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
}

// CORRECT:
if (Build.VERSION.SDK_INT >= 34) {
    startForeground(ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
} else {
    startForeground(ID, notif);
}
```

**5b. Fix notification small icon:**
`getApplicationInfo().icon` can return `0` (invalid) for some launcher icons, causing the notification to crash. Changed to use `android.R.drawable.ic_dialog_info` as a safe fallback.

**5c. `requestRebind()` also added to `load()` in the plugin:**
So it fires even before JS calls `startListening()`.

**5d. Created `BootReceiver.java`:**
A `BroadcastReceiver` that calls `requestRebind()` on `BOOT_COMPLETED`, `QUICKBOOT_POWERON` (Xiaomi-specific boot event), and `MY_PACKAGE_REPLACED`. Registered in the manifest with `RECEIVE_BOOT_COMPLETED` permission.
```java
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        ComponentName cn = new ComponentName(context, NotificationService.class);
        NotificationListenerService.requestRebind(cn);
    }
}
```

**5e. Manifest updates for BootReceiver and API 34+ property:**
```xml
<receiver android:name=".BootReceiver" android:exported="false">
    <intent-filter>
        <action android:name="android.intent.action.BOOT_COMPLETED" />
        <action android:name="android.intent.action.QUICKBOOT_POWERON" />
        <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
    </intent-filter>
</receiver>
<property
    android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE"
    android:value="notification_listener" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
```

**Result:** After enabling **Autostart** in Xiaomi settings, the app started working correctly after close/reopen. The earlier attempts may have already been functionally correct but the missing Autostart permission meant Xiaomi was blocking the service from ever starting. Currently: ✅ works after app close + reopen. ❌ not yet tested while app is fully closed (never re-opened).

---

#### 6. Simulate manual toggle: `requestUnbind()` → `requestRebind()` cycle

**Diagnosis:** `requestRebind()` alone is silently ignored by MIUI/HyperOS when the process was killed violently (swipe/reboot), not cleanly unbound. The manual Settings toggle works because: disable = `requestUnbind()` (voluntary), enable = `requestRebind()` (after voluntary unbind). The key insight is that `requestRebind()` is only guaranteed to work to **undo a voluntary `requestUnbind()`**. We need to simulate that cycle in code.

**6a. Static `instance` reference in `NotificationService`:**
Added `public static NotificationService instance = null;` set in `onCreate()` and cleared in `onDestroy()`, so the Plugin can call `instance.requestUnbind()` at any time.

**6b. `triggerRebindCycle()` method in the Plugin:**
```java
private void triggerRebindCycle(String caller) {
    // Step 1: voluntary unbind (marks the connection as cleanly released)
    if (NotificationService.instance != null) {
        NotificationService.instance.requestUnbind();
    }
    // Step 2: after 600ms, request fresh rebind (now honored by the OS)
    new Handler(Looper.getMainLooper()).postDelayed(() -> {
        ComponentName cn = new ComponentName(getContext(), NotificationService.class);
        NotificationListenerService.requestRebind(cn);
    }, 600);
}
```

**6c. `triggerRebindCycle()` called from two places:**
- `load()` — fires as soon as Capacitor loads the plugin (before any JS runs)
- `startListening()` — fires when JS starts the listener, only if `isConnected == false`

**Result:** Working after close/reopen (confirmed with Autostart enabled). Still pending: testing with app fully closed and never reopened (pure background notification while closed).

---

## Required Data for Debugging (For the User)

To solve this, we need to understand exactly what the Android OS is doing to the process when the app is swiped away.

**Please connect the phone via USB, enable USB Debugging, and run the following commands:**

### 1. Check System Permission Registry
Run this to confirm the OS hasn't silently wiped the permission:
```bash
adb shell settings get secure enabled_notification_listeners
```
*(We expect to see `com.gastoscajafuerte.app/com.capacitor.notifications.listener.NotificationService` in the output).*

### 2. Capture the Kill/Restart Cycle Logs
Run this command to filter specifically for the notification service and Capacitor:
```bash
adb logcat -s NotificationListenerService NotificationService NotificationsListenerPlugin Capacitor ActivityManager
```

**While the logger is running, do the following:**
1. Open the app (ensure the listener is active).
2. Swipe the app away from "Recent Apps" (force close it).
3. Wait 5 seconds.
4. Send a test notification (e.g., a bank transfer).
5. Re-open the app.

Copy the output of the terminal and provide it here.

---

## To the AI Assisting (Claude)

**Points to investigate based on the upcoming logs:**
1. **Is the service being destroyed?** Look for `onDestroy()` calls in the logs. Standard Android behavior is to kill the App process on swipe, which often brings down bound services.
2. **Is it a Bound vs. Started Service issue?** The plugin implements `NotificationListenerService` (which is started and bound by the OS, not the app). If the OS unbinds it when the app dies, how do we force the OS to keep it alive? Do we need to call `startForegroundService` with a persistent notification?
3. **OEM Aggressiveness**: Depending on the brand (Xiaomi, Samsung, etc.), the OS might be killing background services violently. Are there specific `AndroidManifest.xml` flags (like `android:stopWithTask="false"`) or foreground service requirements missing?
4. **Rebind Failure**: Why is the manual toggle required? If `requestRebind` failed to wake it up, why does toggling the system setting work? Is the service crashing silently in the background and entering a crash loop?
