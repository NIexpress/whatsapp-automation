export type UserRole = "OWNER" | "ADMIN" | "MANAGER" | "STAFF";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
}

export type BookingStatus =
  | "DRAFT"
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "IN_CARE"
  | "READY_FOR_PICKUP"
  | "COMPLETED"
  | "CANCELLED"
  | "RESCHEDULED";

export type PaymentStatus = "PENDING" | "PAID" | "REFUNDED" | "OFFLINE_COLLECTED";

export type ConversationStatus = "AI_ACTIVE" | "HUMAN_ACTIVE" | "WAITING_FOR_CUSTOMER" | "CLOSED";

export type SenderType = "CUSTOMER" | "AI" | "STAFF" | "SYSTEM";

export type MessageType = "TEXT" | "INTERACTIVE" | "TEMPLATE" | "IMAGE" | "DOCUMENT";

export type VaccineVerificationStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface DogDaycareConfig {
  business_hours: {
    open: string;  // "08:00"
    close: string; // "19:00"
    dropoff_window: { start: string; end: string }; // "08:00", "11:00"
    pickup_window: { start: string; end: string };  // "16:00", "19:00"
  };
  default_daily_capacity: number; // 15
  address: string;
  google_maps_link: string;
  cancellation_policy: {
    free_cancellation_hours: number; // 24
    late_cancellation_fee_percent: number; // 50
  };
  vaccination_requirements: {
    mandatory: string[]; // ["RABIES", "DHPPI"]
    recommended: string[]; // ["BORDETELLA"]
  };
}
