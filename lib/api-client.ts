import { format } from 'date-fns'
import type {
  CustomerData,
  DogData,
  AppointmentData,
  AvailabilityRuleData,
  DateMarking,
  ApiResponse,
  Daily_note,
} from '@/types'

// Base API URL
const API_BASE_URL = '/api'

// Helper function to handle API responses
async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'API request failed')
  }
  return response.json()
}

// Customer API functions
export async function searchCustomers(
  searchTerm: string
): Promise<CustomerData[]> {
  if (!searchTerm || searchTerm.length < 2) {
    return []
  }

  const response = await fetch(
    `${API_BASE_URL}/customers?search=${encodeURIComponent(searchTerm)}`
  )
  const result = await handleResponse<any[]>(response)
  console.log('Search result:', result)
  return (
    result.data?.map((customer) => ({
      id: customer.id.toString(),
      name: customer.customer_name || '',
      phone: customer.phone || '',
      customerNote: customer.customer_note || '',
      dogs: (customer.dogs || []).map((dog: any) => ({
        id: dog.id.toString(),
        name: dog.dog_name || '',
        breed: dog.dog_breed || '',
        note: dog.dog_note || '',
        previousServices: dog.previous_service || '',
        previousPrice: dog.previous_price || '',
        serviceHistory: dog.services || [],
      })),
    })) || []
  )
}


// Appointment API functions
export async function getAppointmentsByDate(
  date: Date
): Promise<AppointmentData[]> {
  const dateStr = format(date, 'yyyy-MM-dd')
  const response = await fetch(`${API_BASE_URL}/appointments?date=${dateStr}`)
  const result = await handleResponse<AppointmentData[]>(response)
  console.log("getAppointmentsByDate",result.data)
  return result.data || []
}

export async function getAppointmentById(
  id: string
): Promise<AppointmentData[]> {
  const response = await fetch(`${API_BASE_URL}/appointments/${id}`)
  const result = await handleResponse<AppointmentData[]>(response)

  console.log("getAppointmentsById",result.data)

  return result.data || []
}

export async function createAppointment(
  appointment: Omit<AppointmentData, 'id'>
): Promise<AppointmentData> {
  console.log("createAppointment",appointment)
  const response = await fetch(`${API_BASE_URL}/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      date: appointment.date, // Use current date or pass from appointment
      time: appointment.time,
      customerId: appointment.customerId || "",
      customerName: appointment.customerName,
      dogId: appointment.dogId || "",
      dogName: appointment.dogName,
      breed: appointment.breed,
      phone: appointment.phone,
      dogNote: appointment.dogNote,
      customerNote: appointment.customerNote,
      todaysNote: appointment.todaysNote,
      todaysServices: appointment.todaysServices,
      todaysPrice: appointment.todaysPrice,
      status: appointment.status,
    }),
  })
  console.log('Creating appointment with data:', appointment)
  console.log('Creating appointment with response:', response)

  const result = await handleResponse<any>(response)
  const appointmentId = result.data.id.toString()
  const appointmentDetail = await getAppointmentById(appointmentId)

  console.log('Created appointment detail:', appointmentDetail)

  // Return the appointment data
  return {
    appointmentDetail
  }
}

export async function updateAppointment(
  id: string,
  appointment: Partial<AppointmentData>
): Promise<AppointmentData> {
  console.log("updateAppointment",appointment)
  const response = await fetch(`${API_BASE_URL}/appointments/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customerName: appointment.appointmentCustomerName,
      dog_id: appointment.dogId,
      dogName: appointment.appointmentDogName,
      breed: appointment.breed,
      phone: appointment.phone,
      dogNote: appointment.dogNote,
      customerNote: appointment.customerNote,
      todaysNote: appointment.todaysNote,
      todaysServices: appointment.todaysServices,
      todaysPrice: appointment.todaysPrice,
      status: appointment.status,
      appointment_date: appointment.date,
      appointment_time: appointment.time,
    }),
  })
  console.log('Updating appointment with data:', appointment)

  const result = await handleResponse<any>(response)

  // Get the updated appointment with all data
  const getResponse = await fetch(`${API_BASE_URL}/appointments/${id}`)
  const getResult = await handleResponse<AppointmentData>(getResponse)

  return getResult
}

export async function deleteAppointment(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/appointments/${id}`, {
    method: 'DELETE',
  })

  await handleResponse<null>(response)
}

export async function deleteDog(id: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/dogs/${id}`, {
    method: 'DELETE',
  })

  const result = await handleResponse<any[]>(response)
  console.log("deleteDog",result)

  return result
}

// Availability Rules API functions
export async function getAvailabilityRules(): Promise<AvailabilityRuleData[]> {
  const response = await fetch(`${API_BASE_URL}/availability-rules`)
  const result = await handleResponse<any[]>(response)

  return (
    result.data?.map((rule) => ({
      id: rule.id.toString(),
      type: rule.type as 'weekly' | 'specific',
      dayOfWeek: rule.day_of_week !== null ? rule.day_of_week : undefined,
      specificDate: rule.specific_date || undefined,
      time: rule.time,
      isEnabled: rule.is_enabled,
    })) || []
  )
}

export async function saveAvailabilityRules(
  rules: AvailabilityRuleData[]
): Promise<AvailabilityRuleData[]> {
  const formattedRules = rules.map((rule) => ({
    type: rule.type,
    day_of_week: rule.dayOfWeek,
    specific_date: rule.specificDate,
    time: rule.time,
    is_enabled: rule.isEnabled,
    appointment_limit:rule.appointment_limit||null
  }))

  const response = await fetch(`${API_BASE_URL}/availability-rules`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formattedRules),
  })

  const result = await handleResponse<any[]>(response)

  return (
    result.data?.map((rule) => ({
      id: rule.id.toString(),
      type: rule.type as 'weekly' | 'specific',
      dayOfWeek: rule.day_of_week !== null ? rule.day_of_week : undefined,
      specificDate: rule.specific_date || undefined,
      time: rule.time,
      isEnabled: rule.is_enabled,
    })) || []
  )
}

// date-marking API functions
export async function getDateMarking(): Promise<AvailabilityRuleData[]> {
  const response = await fetch(`${API_BASE_URL}/date-marking`)
  const result = await handleResponse<any[]>(response)

  return (
    result.data?.map((rule) => ({
      id: rule.id.toString(),
      type: rule.type as 'weekly' | 'specific',
      markingDateOfWeek: rule.marking_day_of_week !== null ? rule.day_of_week : undefined,
      markingDate: rule.marking_date || undefined,
      color: rule.color || "yellow", // Default color if not provided
    })) || []
  )
}

export async function saveDateMarking(
  rule: DateMarking
): Promise<DateMarking[]> {
  const formattedRules = {
    type: rule.type,
    marking_day_of_week: rule.markingDateOfWeek||"",
    marking_date: rule.date||"",
    color: rule.color || "yellow", // Default color if not provided
  }
  console.log("Rules",rule)
  console.log("formattedRules",rule)
  const response = await fetch(`${API_BASE_URL}/date-marking`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formattedRules),
  })

  const result = await handleResponse<any[]>(response)

  return (
    result
  )
}

export async function deleteDateMarking(date: Date): Promise<void> {
  const dateStr = format(date, "yyyy-MM-dd")
  const response = await fetch(`${API_BASE_URL}/date-marking`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ date: dateStr }),
  })
  console.log("deleteDateMarking",response)

  const result = await handleResponse<any[]>(response)
  return (
    result
  )
}

// Service History functions
export async function addServiceHistory(
  dogId: string,
  serviceData: {
    date: string
    services: string
    price: string
    note: string
  }
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/service-history`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dog_id: dogId,
      ...serviceData,
    }),
  })

  await handleResponse<null>(response)
}

// get daily notes
export async function getDailyNotes(date: Date): Promise<Daily_note> {
  const dateStr = format(date, 'yyyy-MM-dd')
  const response = await fetch(`${API_BASE_URL}/daily-notes?date=${dateStr}`)

  if (!response.ok) {
    if (response.status === 404) return { date: dateStr, note: '' }
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to fetch daily notes')
  }

  const result = await response.json()
  console.log(" getDailyNotes",result)


  if (!result.success) return { date: dateStr, note: '' }

  return {
  id: result.data.id?.toString()||"",
    date: result.data.daily_note_date,
    note: result.data.daily_note || "",
  }
}

export async function saveDailyNotes(
  date: Date,
  note: string
): Promise<Daily_note> {
  const dateStr = format(date, 'yyyy-MM-dd')
  const response = await fetch(`${API_BASE_URL}/daily-notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'DailyNotes/json',
    },
    body: JSON.stringify({
      date: dateStr,
      note,
    }),
  })

  const result = await handleResponse<any>(response)

  return {
    id: result.data.id.toString(),
    date: result.data.date,
    note: result.data.note || "",
  }
}

export async function createCustomer(
  customer: Omit<CustomerData, 'id' | 'dogs'>
): Promise<CustomerData> {
  const phoneArray = Array.isArray(customer.phone) ? customer.phone : [customer.phone];
  const response = await fetch(`${API_BASE_URL}/customers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: customer.name,
      phone: phoneArray,
      customerNote: customer.customerNote,
    }),
  })

  const result = await handleResponse<any>(response)
  console.log("createCustomer api",result)

  return {
    id: result.data.id.toString(),
    name: result.data.customer_name || '',
    phone: result.data.phone || '',
    customer_note: result.data.customer_note || '',
  }
}

export async function createDog(
  dog: Omit<DogData, 'id' | 'previousServices' | 'previousPrice' | 'serviceHistory'>
): Promise<DogData> {
  const response = await fetch(`${API_BASE_URL}/dogs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customer_id: dog.customerId,
      dog_name: dog.dog_name,
      dog_breed: dog.dog_breed,
      dog_note: dog.dog_note,
    }),
  })
  const result = await handleResponse<any>(response)
  console.log("createDog api",result)

  return {
    ok: result.success,
    id: result.data.id.toString(),
    name: result.data.name || '',
    breed: result.data.breed || '',
    note: result.data.note || '',
  }
}
