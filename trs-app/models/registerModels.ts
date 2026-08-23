/**
 * Registers every model that may be referenced by `populate()`.
 *
 * Next.js can evaluate route modules in isolated bundles, so relying on an
 * unrelated route importing a referenced model is unsafe. Import this module
 * once from the shared database connector to make model registration
 * deterministic for every server route and server component.
 */
import "@/models/AuditLog";
import "@/models/AutomationRule";
import "@/models/CampaignAudience";
import "@/models/CampaignExecution";
import "@/models/AuthSession";
import "@/models/BackgroundJob";
import "@/models/CareerOpening";
import "@/models/JobApplication";
import "@/models/Cart";
import "@/models/CoinTransaction";
import "@/models/CoinWallet";
import "@/models/ContactMessage";
import "@/models/Coupon";
import "@/models/CouponRedemption";
import "@/models/CustomerProfile";
import "@/models/CustomerInsight";
import "@/models/CustomerTimelineEvent";
import "@/models/GalleryItem";
import "@/models/GoodsReceipt";
import "@/models/InventoryItem";
import "@/models/InventoryMovement";
import "@/models/Invoice";
import "@/models/JobRun";
import "@/models/KitchenRoutingRule";
import "@/models/KitchenStation";
import "@/models/KitchenTicket";
import "@/models/MediaAsset";
import "@/models/MarketingCampaign";
import "@/models/MenuCategory";
import "@/models/MenuItem";
import "@/models/MenuItemRecipe";
import "@/models/MobileDevice";
import "@/models/ModifierGroup";
import "@/models/Notification";
import "@/models/NotificationDelivery";
import "@/models/NotificationPreference";
import "@/models/Order";
import "@/models/OrderCounter";
import "@/models/POSCashMovement";
import "@/models/POSRegister";
import "@/models/POSShift";
import "@/models/Payment";
import "@/models/PaymentWebhookEvent";
import "@/models/PaymentReconciliation";
import "@/models/PaymentManagementSnapshot";
import "@/models/FinancialReportSnapshot";
import "@/models/BudgetPlan";
import "@/models/BudgetForecastSnapshot";
import "@/models/ExecutiveFinanceSnapshot";
import "@/models/Permission";
import "@/models/PickupPerson";
import "@/models/PurchaseOrder";
import "@/models/Referral";
import "@/models/Reservation";
import "@/models/ReservationCounter";
import "@/models/Review";
import "@/models/ReviewHelpfulVote";
import "@/models/Role";
import "@/models/SecurityEvent";
import "@/models/SecurityToken";
import "@/models/SiteBanner";
import "@/models/SpinWheelCampaign";
import "@/models/StaffProfile";
import "@/models/Supplier";
import "@/models/SupplierPayment";
import "@/models/SystemAuditLog";
import "@/models/SystemSetting";
import "@/models/TaxClass";
import "@/models/Testimonial";
import "@/models/User";
import "@/models/FinanceAuditEvent";
import "@/models/FinanceApprovalRequest";
import "@/models/FinanceGovernanceSnapshot";

import "@/models/FinanceJobRun";
import "@/models/FinancePeriodClose";
import "@/models/ReportDefinition";
import "@/models/ReportExecution";
import "@/models/ReportJob";
import "@/models/ReportScheduleAudit";
import "@/models/ScheduledReport";
