// Customer Management Types
export interface Customer {
  id: number
  customer_name: string | null
  customer_note: string | null
  customer_active: boolean
  created_at: string
  updated_at: string
  phones?: CustomerPhone[]
  dogs?: Dog[]
}

export interface CustomerPhone {
  id: number
  customer_id: number
  phone_owner: string | null
  phone: string
  phone_type: string | null
  is_primary: boolean
  created_at: string
  updated_at: string
}

export interface Dog {
  id: number
  customer_id: number
  dog_name: string
  dog_breed: string | null
  dog_note: string | null
  dog_active: boolean
  created_at: string
  updated_at: string
  service_history?: ServiceHistory[]
  upcoming_appointments?: Appointment[]
}

export interface ServiceHistory {
  id: number
  dog_id: number
  service_date: string
  service: string
  service_price: number | null
  service_note: string | null
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: number
  appointment_customer_name: string | null
  appointment_dog_name: string | null
  dog_id: number | null
  appointment_dog_breed: string | null
  appointment_phone: string | null
  appointment_date: string
  appointment_time: string
  appointment_active: boolean
  today_services: string | null
  today_price: number | null
  today_note: string | null
  customer_note: string | null
  appointment_status: string
  created_at: string
  updated_at: string
}

// Frontend types
export interface CustomerListItem {
  id: string
  name: string
  note: string
  active: boolean
  phones: {
    id: string
    owner: string
    phone: string
    type: string
    isPrimary: boolean
  }[]
  dogs: {
    id: string
    name: string
    breed: string
    active: boolean
  }[]
  totalDogs: number
  activeDogs: number
}

export interface CustomerDetail extends CustomerListItem {
  dogs: DogDetail[]
  email: string | null
}

export interface DogDetail {
  id: string
  name: string
  breed: string
  note: string
  active: boolean
  recentServices: {
    id: string
    date: string
    service: string
    price: string
    note: string
  }[]
  upcomingAppointments: {
    id: string
    date: string
    time: string
    services: string
    status: string
  }[]
}
