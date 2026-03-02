/**
 * i18n/translations.ts
 * Centralized strings for English and Spanish.
 * Usage: const { t } = useLanguage();  →  t('nav.dashboard')
 */

export type Lang = 'es' | 'en';

export const translations = {
    // ── Navigation ─────────────────────────────────────────────
    'nav.dashboard': { es: 'Resumen', en: 'Overview' },
    'nav.movements': { es: 'Movimientos', en: 'Movements' },
    'nav.stats': { es: 'Métricas', en: 'Stats' },
    'nav.profile': { es: 'Perfil', en: 'Profile' },

    // ── Header ─────────────────────────────────────────────────
    'header.banks_active': { es: '🏦 Bancos activos', en: '🏦 Banks active' },
    'header.system_active': { es: 'Sistema Activo', en: 'System Active' },
    'header.hello': { es: 'Hola', en: 'Hey' },

    // ── Common buttons ─────────────────────────────────────────
    'btn.save': { es: 'Guardar', en: 'Save' },
    'btn.cancel': { es: 'Cancelar', en: 'Cancel' },
    'btn.delete': { es: 'Eliminar', en: 'Delete' },
    'btn.confirm': { es: 'Confirmar', en: 'Confirm' },
    'btn.close': { es: 'Cerrar', en: 'Close' },
    'btn.add': { es: 'Agregar', en: 'Add' },
    'btn.edit': { es: 'Editar', en: 'Edit' },
    'btn.back': { es: 'Volver', en: 'Back' },
    'btn.ignore': { es: 'Ignorar', en: 'Ignore' },
    'btn.opening': { es: 'Abriendo...', en: 'Opening...' },
    'btn.record_expense': { es: '✓ Registrar gasto', en: '✓ Record expense' },
    'btn.record_income': { es: '✓ Registrar ingreso', en: '✓ Record income' },

    // ── Transaction types ──────────────────────────────────────
    'type.expense': { es: 'Gasto', en: 'Expense' },
    'type.income': { es: 'Ingreso', en: 'Income' },

    // ── Transaction form fields ────────────────────────────────
    'field.description': { es: 'Descripción', en: 'Description' },
    'field.amount': { es: 'Monto', en: 'Amount' },
    'field.date': { es: 'Fecha', en: 'Date' },
    'field.category': { es: 'Categoría', en: 'Category' },
    'field.currency': { es: 'Moneda', en: 'Currency' },
    'field.notes': { es: 'Notas', en: 'Notes' },
    'field.merchant': { es: 'Comercio', en: 'Merchant' },
    'field.payment_method': { es: 'Método de pago', en: 'Payment method' },

    // ── Categories ─────────────────────────────────────────────
    'cat.alimentacion': { es: 'Alimentación', en: 'Food & Drink' },
    'cat.transporte': { es: 'Transporte', en: 'Transport' },
    'cat.salud': { es: 'Salud', en: 'Health' },
    'cat.entretenimiento': { es: 'Entretenimiento', en: 'Entertainment' },
    'cat.viajes': { es: 'Viajes', en: 'Travel' },
    'cat.suscripcion': { es: 'Suscripción', en: 'Subscription' },
    'cat.servicios': { es: 'Servicios', en: 'Services' },
    'cat.educacion': { es: 'Educación', en: 'Education' },
    'cat.ropa': { es: 'Ropa', en: 'Clothing' },
    'cat.hogar': { es: 'Hogar', en: 'Home' },
    'cat.tecnologia': { es: 'Tecnología', en: 'Technology' },
    'cat.otro': { es: 'Otro', en: 'Other' },

    // ── Dashboard ──────────────────────────────────────────────
    'dashboard.balance': { es: 'Balance', en: 'Balance' },
    'dashboard.income': { es: 'Ingresos', en: 'Income' },
    'dashboard.expenses': { es: 'Gastos', en: 'Expenses' },
    'dashboard.recent': { es: 'Últimos movimientos', en: 'Recent transactions' },
    'dashboard.no_transactions': { es: 'Sin transacciones aún', en: 'No transactions yet' },
    'dashboard.savings_goal': { es: 'Meta de ahorro', en: 'Savings goal' },

    // ── Movements ─────────────────────────────────────────────
    'movements.title': { es: 'Movimientos', en: 'Transactions' },
    'movements.search': { es: 'Buscar...', en: 'Search...' },
    'movements.all': { es: 'Todo', en: 'All' },
    'movements.expenses': { es: 'Gastos', en: 'Expenses' },
    'movements.income': { es: 'Ingresos', en: 'Income' },
    'movements.empty': { es: 'Sin resultados', en: 'No results' },

    // ── Stats ──────────────────────────────────────────────────
    'stats.title': { es: 'Estadísticas', en: 'Statistics' },
    'stats.by_category': { es: 'Por categoría', en: 'By category' },
    'stats.monthly_trend': { es: 'Tendencia mensual', en: 'Monthly trend' },

    // ── Profile ────────────────────────────────────────────────
    'profile.title': { es: 'Perfil', en: 'Profile' },
    'profile.language': { es: 'Idioma', en: 'Language' },
    'profile.theme': { es: 'Tema', en: 'Theme' },
    'profile.currency': { es: 'Moneda principal', en: 'Primary currency' },
    'profile.monthly_goal': { es: 'Meta mensual', en: 'Monthly goal' },
    'profile.bank_sync': { es: 'Sincronización bancaria', en: 'Bank sync' },
    'profile.bank_sync_desc': { es: 'Detectar notificaciones de bancos automáticamente', en: 'Auto-detect bank push notifications' },
    'profile.auto_add': { es: 'Agregar automáticamente', en: 'Auto-add transactions' },
    'profile.auto_add_desc': { es: 'Guardar sin pedir confirmación', en: 'Save without asking for confirmation' },
    'profile.logout': { es: 'Cerrar sesión', en: 'Log out' },
    'profile.travel_mode': { es: 'Modo Viaje', en: 'Travel Mode' },
    'profile.travel_mode_desc': { es: 'Registrar gastos en moneda extranjera', en: 'Track expenses in foreign currency' },

    // ── Bank notifications panel ────────────────────────────────
    'bank.panel_title': { es: 'Órdenes Pendientes', en: 'Pending Orders' },
    'bank.panel_subtitle': { es: 'Centro de Notificaciones', en: 'Notification Center' },
    'bank.detected': { es: 'Notificación detectada', en: 'Notification detected' },
    'bank.empty_title': { es: 'Sin órdenes pendientes', en: 'No pending orders' },
    'bank.empty_desc': { es: 'Cuando recibas una notificación de un banco, aparecerá aquí para que la puedas registrar.', en: 'When you receive a bank notification, it will appear here for you to record.' },

    // ── Auth ───────────────────────────────────────────────────
    'auth.welcome': { es: 'Bienvenido', en: 'Welcome' },
    'auth.username': { es: 'Nombre de usuario', en: 'Username' },
    'auth.login': { es: 'Entrar', en: 'Sign in' },
    'auth.create': { es: 'Crear cuenta', en: 'Create account' },

    // ── Travel mode ────────────────────────────────────────────
    'travel.active': { es: 'Modo Viaje Activo', en: 'Travel Mode Active' },
    'travel.inactive': { es: 'Modo Viaje Inactivo', en: 'Travel Mode Inactive' },

    // ── Bank explainer modal ───────────────────────────────────
    'bank_explainer.title': { es: 'Seguridad y Privacidad', en: 'Security & Privacy' },
    'bank_explainer.subtitle': { es: 'Tu tranquilidad es prioridad', en: 'Your peace of mind is priority' },
    'bank_explainer.point1_title': { es: 'Filtro Inteligente', en: 'Smart Filter' },
    'bank_explainer.point1_desc': { es: 'Solo escuchamos notificaciones de bancos (Brubank, Mercado Pago, etc). Tus mensajes privados son ignorados.', en: 'We only listen to bank notifications. Your private messages are completely ignored.' },
    'bank_explainer.point2_title': { es: 'Sin intermediarios', en: 'No Middlemen' },
    'bank_explainer.point2_desc': { es: 'El procesamiento de nombres y montos ocurre en tiempo real. No vendemos tus datos a terceros.', en: 'Transaction parsing happens in real-time. We never sell your data to third parties.' },
    'bank_explainer.point3_title': { es: 'Control Total', en: 'Full Control' },
    'bank_explainer.point3_desc': { es: 'Puedes activar o desactivar este permiso en cualquier momento desde los ajustes de Android.', en: 'You can enable or disable this permission at any time from your Android settings.' },
    'bank_explainer.btn_accept': { es: 'Entendido, activar', en: 'Got it, enable' },

    // ── New order modal ────────────────────────────────────────
    'modal.new_transaction': { es: 'Nueva transacción', en: 'New transaction' },
    'modal.edit_transaction': { es: 'Editar transacción', en: 'Edit transaction' },

    // ── Common (shared across components) ─────────────────────
    'common.balance': { es: 'Balance', en: 'Balance' },
    'common.income_arrow': { es: '↑ Ingresos', en: '↑ Income' },
    'common.expense_arrow': { es: '↓ Gastos', en: '↓ Expenses' },
    'common.spent': { es: 'Gastado', en: 'Spent' },
    'common.limit': { es: 'Límite', en: 'Limit' },
    'common.no_data': { es: 'Sin datos', en: 'No data' },
    'common.see_all': { es: 'VER TODO', en: 'SEE ALL' },
    'common.used': { es: 'Usado', en: 'Used' },

    // ── ProfileTab — card labels ───────────────────────────────
    'profile.card_identity': { es: 'Identidad', en: 'Identity' },
    'profile.card_identity_badge': { es: 'Activo', en: 'Active' },
    'profile.card_manage_devices': { es: 'Gestionar dispositivos', en: 'Manage devices' },
    'profile.card_expense_goal': { es: 'Meta de Gastos', en: 'Expense Goal' },
    'profile.goal_consumed': { es: '% consumido', en: '% used' },
    'profile.days_left_pre': { es: 'Faltan', en: '' },
    'profile.days_left_suf': { es: 'días para el cierre', en: 'days left to close' },
    'profile.card_currency': { es: 'Divisa', en: 'Currency' },
    'profile.currency_sub': { es: '↺ Símbolo moneda', en: '↺ Currency symbol' },
    'profile.theme_on': { es: 'Activado', en: 'On' },
    'profile.theme_off': { es: 'Desactivado', en: 'Off' },
    'profile.bank_integration': { es: 'Integración Bancaria', en: 'Bank Integration' },
    'profile.bank_linked': { es: 'Vinculado', en: 'Linked' },

    // ── ProfileTab — categories view ───────────────────────────
    'profile.categories_title': { es: 'Gestión de tus etiquetas', en: 'Manage your tags' },
    'profile.cat_tx_count': { es: 'movimientos', en: 'transactions' },
    'profile.apply_all': { es: 'Aplicar a todos', en: 'Apply to all' },
    'profile.cat_new_emoji': { es: 'Nuevo Emoji', en: 'New Emoji' },
    'profile.cat_new_name': { es: 'Nuevo Nombre', en: 'New Name' },

    // ── ProfileTab — notifications view ───────────────────────
    'profile.autosync_title': { es: 'Auto-Sincronización', en: 'Auto-Sync' },
    'profile.notif_banks': { es: 'Escuchar Bancos y Billeteras', en: 'Listen to Banks & Wallets' },
    'profile.notif_auto_save': { es: 'Añadir automático sin preguntar', en: 'Auto-save without asking' },
    'profile.notif_beta': { es: 'Módulo en desarrollo (Beta API)', en: 'Module under development (Beta API)' },

    // ── ProfileTab — identity view ─────────────────────────────
    'profile.user_profile': { es: 'Perfil de Usuario', en: 'User Profile' },
    'profile.social_links': { es: 'Vinculaciones Sociales', en: 'Social Links' },
    'profile.linked_devices': { es: 'Dispositivos Vinculados', en: 'Linked Devices' },
    'profile.change_photo': { es: 'Cambiar Foto de Perfil', en: 'Change Profile Photo' },
    'profile.username_label': { es: 'Nombre de Usuario', en: 'Username' },

    // ── ProfileTab — goal view ─────────────────────────────────
    'profile.configure_goal': { es: 'Configurar Meta Mensual', en: 'Configure Monthly Goal' },
    'profile.goal_max_amount': { es: 'Monto máximo de gasto', en: 'Max expense amount' },
    'profile.goal_hint': { es: 'Esta meta se utilizará para calcular tus indicadores de salud financiera y alertas de consumo en las gráficas de métricas.', en: 'This goal will be used to calculate your financial health indicators and budget alerts on the metrics charts.' },
    'profile.goal_save_btn': { es: 'Guardar Meta', en: 'Save Goal' },

    // ── MovementsTab ───────────────────────────────────────────
    'movements.hide_filters': { es: 'Ocultar filtros', en: 'Hide filters' },
    'movements.show_filters': { es: 'Filtrar', en: 'Filter' },
    'movements.export': { es: 'Exportar Excel', en: 'Export Excel' },
    'movements.import_excel': { es: 'Importar Excel', en: 'Import Excel' },
    'movements.all_months': { es: 'Todos (Meses)', en: 'All (Months)' },
    'movements.all_years': { es: 'Todos (Años)', en: 'All (Years)' },
    'movements.all_categories': { es: 'Todas las categorías', en: 'All categories' },
    'movements.filter_all': { es: 'Todos', en: 'All' },
    'movements.no_results': { es: 'Sin resultados para este filtro.', en: 'No results for this filter.' },
    'movements.prev_page': { es: '← Anterior', en: '← Previous' },
    'movements.next_page': { es: 'Siguiente →', en: 'Next →' },
    'movements.sidebar_goal': { es: 'Objetivo Gastos', en: 'Expense Goal' },
    'movements.sidebar_fixed_var': { es: 'Fijo vs Variable', en: 'Fixed vs Variable' },
    'movements.sidebar_top_cats': { es: 'Top Categorías', en: 'Top Categories' },
    'movements.no_goal': { es: 'Sin límite definido', en: 'No limit defined' },
    'movements.set_goal': { es: 'Configurá tu meta mensual en Perfil', en: 'Set your monthly goal in Profile' },
    'movements.fixed_expenses': { es: 'Gastos Fijos', en: 'Fixed Expenses' },
    'movements.variable_expenses': { es: 'Variables', en: 'Variable' },

    // ── DashboardTab ───────────────────────────────────────────
    'dashboard.travel_budget': { es: 'Presupuesto Viaje', en: 'Travel Budget' },
    'dashboard.expense_goal': { es: 'Meta de Gastos', en: 'Expense Goal' },
    'dashboard.liquidity': { es: 'Liquidez Actual', en: 'Current Liquidity' },
    'dashboard.status_red': { es: 'EN ROJO', en: 'IN RED' },
    'dashboard.status_tight': { es: 'AJUSTADO', en: 'TIGHT' },
    'dashboard.status_solid': { es: 'SÓLIDO', en: 'SOLID' },
    'dashboard.status_stable': { es: 'ESTABLE', en: 'STABLE' },
    'dashboard.spending_more': { es: 'más este mes', en: 'more this month' },
    'dashboard.spending_less': { es: 'menos este mes', en: 'less this month' },
    'dashboard.no_limit': { es: 'Sin límite definido', en: 'No limit defined' },
    'dashboard.set_goal_hint': { es: 'Definí una meta mensual', en: 'Set a monthly goal' },
    'dashboard.configure_limit': { es: 'Configurar límite', en: 'Configure limit' },
    'dashboard.top_cats': { es: 'Categorías Top', en: 'Top Categories' },
    'dashboard.no_data': { es: 'Sin datos aún', en: 'No data yet' },
    'dashboard.activity': { es: 'Actividad Reciente', en: 'Recent Activity' },
    'dashboard.no_recent': { es: 'Sin transacciones recientes.', en: 'No recent transactions.' },
    'dashboard.payment_sheet': { es: 'Ficha de Pagos', en: 'Payment Sheet' },
    'dashboard.annual': { es: 'ANUAL', en: 'ANNUAL' },
    'dashboard.biannual': { es: 'SEMESTRAL', en: 'BIANNUAL' },
    'dashboard.every_n_months': { es: 'CADA', en: 'EVERY' },
    'dashboard.paid': { es: 'PAGADO', en: 'PAID' },
    'dashboard.pending': { es: 'PENDIENTE', en: 'PENDING' },
    'dashboard.add_recurring': { es: 'Añadir Recurrente', en: 'Add Recurring' },
    'dashboard.no_fixed': { es: 'Sin gastos fijos registrados.', en: 'No fixed expenses registered.' },
    'dashboard.reference_day': { es: 'Referencia: Día', en: 'Reference: Day' },

    // ── StatsTab ───────────────────────────────────────────────
    'stats.metrics': { es: 'Métricas', en: 'Metrics' },
    'stats.all_year': { es: 'Todo el año', en: 'Full year' },
    'stats.annual_report': { es: 'Reporte Anual', en: 'Annual Report' },
    'stats.monthly_report': { es: 'Reporte Mensual', en: 'Monthly Report' },
    'stats.liquidity': { es: 'Liquidez', en: 'Liquidity' },
    'stats.income': { es: 'Ingresos', en: 'Income' },
    'stats.expenses_label': { es: 'Egresos', en: 'Expenses' },
    'stats.goal_consumption': { es: 'Consumo de meta', en: 'Goal consumption' },
    'stats.spending_trend': { es: 'Tendencias de Gasto', en: 'Spending Trends' },
    'stats.top_cats': { es: 'Top Categorías', en: 'Top Categories' },
    'stats.avg': { es: 'Prom.', en: 'Avg.' },
    'stats.limit_label': { es: 'LÍMITE', en: 'LIMIT' },
    'stats.no_expenses': { es: 'Sin gastos en este período', en: 'No expenses in this period' },
    'stats.pct_total': { es: '% del total', en: '% of total' },
    'stats.cat_breakdown': { es: 'Desglose de Categoría', en: 'Category Breakdown' },
    'stats.no_txs_period': { es: 'Sin transacciones en este período', en: 'No transactions in this period' },
} as const;

export type TranslationKey = keyof typeof translations;
