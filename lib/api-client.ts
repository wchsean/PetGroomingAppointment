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
      generalNote: customer.customer_note || '',
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
): Promise<AppointmentData | null> {
  const response = await fetch(`${API_BASE_URL}/appointments/${id}`)

  if (!response.ok) {
    if (response.status === 404) return null
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to fetch appointment')
  }

  const result = await response.json()

  if (!result.success) return null
  console.log('Fetched appointment data:', result.data)

  const appointment = result.data.appointment
  const dog = result.data.dog
  const customer = result.data.customer
  const serviceHistory = result.data.serviceHistory || []

  return {
    id: appointment.id.toString(),
    time: appointment.appointment_time,
    customerId: customer?.id?.toString() || null,
    dogId: dog?.id?.toString() || null,
    appointmentCustomerName: appointment.appointment_customer_name || '',
    appointmentDogName: appointment.appointment_dog_name || '',
    customerName: customer.customer_name || '',
    dogName: dog.dog_name || '',
    breed:  appointment.appointment_dog_breed || dog.dog_breed ||'',
    phone: appointment.appointment_phone || '',
    customerPhone:customer.phones || '',
    dogNote: dog.dog_note || '',
    customerNote: appointment.customer_note || '',
    todaysNote: appointment.today_note || '',
    previousServices: serviceHistory?.[0]?.service || '',
    previousPrice: serviceHistory?.[0]?.total_price || '',
    serviceHistory: serviceHistory,
    todaysServices: appointment.today_services || '',
    todaysPrice: appointment.today_price || '',
    status: appointment.appointment_status,
  }
}

export async function createAppointment(
  appointment: Omit<AppointmentData, 'id'>
): Promise<AppointmentData> {
  console.log("createAppointment",createAppointment)
  const response = await fetch(`${API_BASE_URL}/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      date: appointment.date, // Use current date or pass from appointment
      time: appointment.time,
      customerName: appointment.customerName,
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
  const appointmentDedail = await getAppointmentById(appointmentId)

  console.log('Created appointment detail:', appointmentDedail)

  // Return the appointment data
  return {
    appointmentDedail
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
      customerName: appointment.customerName,
      dog_id: appointment.dogId,
      dogName: appointment.dogName,
      dog_breed: appointment.breed,
      phone: appointment.phone,
      dogNote: appointment.dogNote,
      customerNote: appointment.customerNote,
      todaysNote: appointment.todaysNote,
      todaysServices: appointment.todaysServices,
      todaysPrice: appointment.todaysPrice,
      status: appointment.status,
    }),
  })
  console.log('Updating appointment with data:', appointment)

  const result = await handleResponse<any>(response)

  // Get the updated appointment with all data
  const getResponse = await fetch(`${API_BASE_URL}/appointments/${id}`)
  const getResult = await handleResponse<AppointmentData>(getResponse)

  return getResult.data!
}

export async function deleteAppointment(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/appointments/${id}`, {
    method: 'DELETE',
  })

  await handleResponse<null>(response)
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

  return {
    id: result.data.id.toString(),
    name: result.data.name || '',
    breed: result.data.breed || '',
    note: result.data.note || '',
  }
}
