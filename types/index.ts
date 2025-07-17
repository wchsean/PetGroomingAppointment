export interface Customer {
  id: number
  name: string | null
  phone: string[] | null
  general_note: string | null
  created_at: string
  updated_at: string
  dogs?: Dog[]
}

export interface Dog {
  id: number
  customer_id: number
  name: string
  breed: string | null
  note: string | null
  created_at: string
  updated_at: string
  previous_services?: string | null
  previous_price?: string | null
  service_history?: ServiceHistory[]
}

export interface ServiceHistory {
  id: number
  dog_id: number
  date: string
  services: string
  price: string | null
  note: string | null
  created_at: string
}

export interface Appointment {
  id: number
  dog_id: number | null
  phone: string[] | null
  date: string
  time: string
  quick_details: string | null
  todays_services: string | null
  todays_price: string | null
  todays_note: string | null
  status: string
  created_at: string
  updated_at: string
  dogName?: Dog
  customerName?: Customer
  active: boolean
}

export interface AvailabilityRule {
  id: number
  type: "weekly" | "specific"
  day_of_week: number | null
  specific_date: string | null
  time: string
  is_enabled: boolean
  created_at: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Frontend types
export interface CustomerData {
  id: string
  name: string
  phone: string
  customerNote: string
  dogs: DogData[]
  services: ServiceHistoryData[]
  appointments: AppointmentData[]
}

export interface DogData {
  id: string
  name: string
  breed: string
  note: string
  previousServices: string
  previousPrice: string
  serviceHistory: ServiceHistoryData[]
}

export interface ServiceHistoryData {
  id: string
  date: string
  services: string
  price: string
  note: string
}

export interface AppointmentData {
  id: string
  data: string
  time: string
  quickDetails?: string
  customerName: string
  dogName: string
  phone: string
  dogNote: string
  customerNote: string
  todaysNote: string
  previousServices: string
  previousPrice: string
  todaysServices: string
  todaysPrice: string
  serviceHistory: []
  status: "no-status" | "C" | "F" | "FN" | "P" | "x"
}

export interface AvailabilityRuleData {
  id: string
  type: "weekly" | "specific"
  dayOfWeek?: number
  specificDate?: string
  time: string
  isEnabled: boolean
  appointment_limit?:number
}

export interface DateMarking {
  id: string
  type: "weekly" | "specific" | "holiday"
  marking_day_of_week?: number
  marking_date?: string
}

export interface Daily_note {
  id: string
  date: string
  note: string
}