"use client"

import type React from "react"

import { useState, useEffect, use } from "react"
import {
  CalendarIcon,
  Clock,
  Plus,
  Edit2,
  Trash2,
  User,
  StickyNote,
  ToggleLeft,
  ToggleRight,
  Search,
  Check,
  X,
  Settings,
  History,
  AlertTriangle,
} from "lucide-react"
import { format, set } from "date-fns"
import "dotenv/config"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { CustomerData, Daily_note, DogData } from "@/types"
import {createCustomer,createDog, getAppointmentsByDate, createAppointment,updateAppointment,deleteAppointment, getAvailabilityRules,saveAvailabilityRules, searchCustomers, getDailyNotes, saveDailyNotes, getDateMarking, saveDateMarking, deleteDateMarking} from "@/lib/api-client"
import { on } from "events"


interface ServiceHistory {
  id: string
  date: string
  services: string
  price: string
  note: string
}

interface Appointment {
  id: string
  time: string
  name: string
  appointmentCustomerName: string
  appointmentDogName: string
  dogName: string
  dogId: string
  phone: string
  customerNote: string
  todaysNote: string
  previousServices: string
  previousPrice: string
  todaysServices: string
  todaysPrice: string
  status: "no-status" | "C" | "F" | "FN" | "P" | "x"
}

interface DayData {
  appointments: Appointment[]
  dailyNote: Daily_note
}

interface AvailabilityRule {
  id: string
  type: "weekly" | "specific"
  dayOfWeek?: number // 0-6 (Sunday-Saturday) for weekly
  specificDate?: string // YYYY-MM-DD for specific
  time: string
  isEnabled: boolean
}

const statusOptions = [
  { value: "no-status", label: "No Status", color: "bg-gray-100 text-gray-800 border-gray-200" },
  { value: "C", label: "Already at shop", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "F", label: "Finish, not notified yet", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value: "FN", label: "Finish and notified", color: "bg-green-100 text-green-800 border-green-200" },
  { value: "P", label: "Already pick up", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "x", label: "No Show", color: "bg-red-100 text-red-800 border-red-200" },
]

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]



// Phone validation function
const validatePhone = (phone: string): boolean => {
  const cleanPhone = phone.replace(/\D/g, "")
  return cleanPhone.length === 8 || cleanPhone.length === 10
}

export default function DailyAppointmentBook() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [dayData, setDayData] = useState<Record<string, DayData>>({})
  const [customers, setcustomers] = useState<CustomerData[]>([])
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRule[]>([])
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false)
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false)
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false)
  const [isCustomerDetailDialogOpen, setIsCustomerDetailDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null)
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null)
  const [editingAppointment, setEditingAppointment] = useState<string | null>(null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  
  const [holidaySet, setHolidaySet] = useState<Set<string>>(new Set())
  const [dateMarking, setDateMarking] = useState<Set<string>>(new Set())

  // Generate time slots (8:00 - 20:00, every 30 minutes)
  const timeSlots = []
  for (let hour = 8; hour <= 17; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 20 && minute > 0) break
      const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
      timeSlots.push(timeString)
    }
  }

  const dateKey = format(selectedDate, "yyyy-MM-dd")
  let currentDayData = dayData[dateKey] || { appointments: [], dailyNote: "" }

  console.log("Current day data:", currentDayData)
  console.log(" dayData:", dayData)
  console.log("setAvailabilityRules", availabilityRules)

  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true)
      const dateKey = format(selectedDate, "yyyy-MM-dd")

      try {
        const [appointments, dailyNote, rules] = await Promise.all([
          getAppointmentsByDate(selectedDate),
          getDailyNotes(selectedDate),
          getAvailabilityRules(),
        ])
        
        setDayData((prev) => ({
          ...prev,
          [dateKey]: {
            appointments,
            dailyNote,
          },
        }))
        setAvailabilityRules(rules)
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setIsLoading(false)
      }
    }

  loadAllData()
  }, [selectedDate])

  //get australia Holidays
  useEffect(() => {
    currentDayData = dayData[dateKey] || { appointments: [], dailyNote: "" }
  }, [dayData])

  useEffect(() => {
    async function fetchHolidays () {
      const year = selectedDate?.getFullYear() ?? new Date().getFullYear()
      const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/AU`)
      const data = await res.json()
      const vicHolidays = data.filter(
        (item: any) => item.counties === null || (item.counties && item.counties.includes("AU-VIC"))
      )
      const holidayDates = vicHolidays.map((item: any) => item.date)
      setHolidaySet(new Set(holidayDates))
    }
    fetchHolidays()
  }, [])

  useEffect(() => {
  async function fetchMarkingDates() {
    const res = await getDateMarking()  // 你的後端 API
    const dateMarking =  res.map((item: any) => format(item.markingDate, "yyyy-MM-dd"))
    setDateMarking(new Set(dateMarking))  // 把日期陣列轉成 Set
  }
  fetchMarkingDates()
}, [])


  const handleAddAppointment = async (appointmentData: Omit<Appointment, "id">) => {
    try {
      const newAppointment = await createAppointment(appointmentData)

      setDayData((prev) => ({
        ...prev,
        [dateKey]: {
          ...currentDayData,
          appointments: [...currentDayData.appointments, newAppointment.appointmentDedail],
        },
      }))

      setIsAppointmentDialogOpen(false)
      setSelectedTimeSlot("")
    } catch (error) {
      console.error("Error creating appointment:", error)
    }
  }

  const handleUpdateAppointment = async (
    appointmentId: string,
    changes: Partial<AppointmentData>
  ) => {
    try {
      await updateAppointment(appointmentId, changes);

      setDayData((prev) => {
        const updatedAppointments = prev[dateKey]?.appointments.map((apt) =>
          apt.id === appointmentId ? { ...apt, ...changes } : apt
        ) || [];

        return {
          ...prev,
          [dateKey]: {
            ...prev[dateKey],
            appointments: updatedAppointments,
          },
        };
      });
    } catch (error) {
      console.error("Failed to update appointment:", error);
    }
  };


  const handleDeleteAppointment = async (appointmentId: string) => {
    
    try {
      // Call API to delete appointment
      await deleteAppointment(appointmentId)
      setDayData((prev) => ({
        ...prev,
        [dateKey]: {
          ...currentDayData,
          appointments: currentDayData.appointments.filter((apt) => apt.id !== appointmentId),
        },
      }))
      setIsDeleteDialogOpen(false)
      setAppointmentToDelete(null)
    } catch (error) {
      console.error("Error deleting appointment:", error)
    }
  }

  const handleSaveDailyNote = async (note: string) => {
    // Save the daily note to the database
    try {
      await saveDailyNotes(dateKey, note)
      setDayData((prev) => ({
        ...prev,
        [dateKey]: {
          ...currentDayData,
          dailyNote: { note }, // Update daily note
        },
    }))
      setIsNoteDialogOpen(false)
    } catch (error) {
      console.error("Error saving daily note:", error)
    }

  }

  const getAppointmentsForTime = (time: string) => {
    return currentDayData.appointments.filter((apt) => apt.time === time)
  }

  const openAddDialog = (time: string) => {
    setSelectedTimeSlot(time)
    setIsAppointmentDialogOpen(true)
  }

  const openDeleteDialog = (appointmentId: string) => {
    setAppointmentToDelete(appointmentId)
    setIsDeleteDialogOpen(true)
  }

  const handleAppointmentClick = (appointment: any) => {
    // Find customer data if available
    const customer = customers.find(
      (c) => c.phone === appointment.phone || (c.name === appointment.customerName && c.dogName === appointment.dogName),
    )
    if (appointment) {
      setSelectedCustomer(appointment)
      setIsCustomerDetailDialogOpen(true)
    }
  }

  const getStatusConfig = (status: Appointment["status"]) => {
    return statusOptions.find((option) => option.value === status) || statusOptions[0]
  }

  const isTimeSlotAvailable = (time: string, date: Date) => {
    const dayOfWeek = date.getDay()
    const dateString = format(date, "yyyy-MM-dd")

    return availabilityRules.some((rule) => {
      if (!rule.isEnabled) return false
      if (rule.time !== time) return false

      if (rule.type === "weekly" && rule.dayOfWeek === dayOfWeek) return true
      if (rule.type === "specific" && rule.specificDate === dateString) return true

      return false
    })
  }

  const handleAddMarkingDate = async (date: Date | number, type: string = "specific") => {
    if (!date) return

    if (type=="specific"){
      const formatted = format(selectedDate, "yyyy-MM-dd")
      if (dateMarking.has(formatted)) return
      const dateMarkingdata = {
        type : type||"specific",
        date : formatted
      }
      const res = await saveDateMarking(dateMarkingdata)
      if (res) {
        setDateMarking(prev => new Set(prev).add(formatted))
      } else {
        console.error("儲存失敗")
      }
      setDateMarking(prev => new Set(prev).add(formatted))
    }
  }

  const handleUnmarkDate = async (date: Date | number, type: string = "specific") => {
    const formatted = format(date, "yyyy-MM-dd")
    const res = await deleteDateMarking(formatted)
    if (res) {
      setDateMarking(prev => {
        const newSet = new Set(prev)
        newSet.delete(formatted) // remove mark day
        return newSet
      })
    } else {
      console.error("Failed to delete date marking")
    }
  }

  const markAvailableAppointmentDate = (date: Date, availabilityRules: any[]): boolean => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 只標記今天或以後的日期
    if (date < today) return false

    const dateString = format(date, "yyyy-MM-dd")
    const dayOfWeek = date.getDay()

    return availabilityRules.some((rule) => {
      if (!rule.isEnabled) return false

      if (rule.type === "weekly" && rule.dayOfWeek === dayOfWeek) return true
      if (rule.type === "specific" && rule.specificDate === dateString) return true

      return false
    })
  }
    
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center gap-4 mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Daily Appointment Book</h1>
          <Button variant="outline" size="sm" onClick={() => setIsSettingsDialogOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
        <p className="text-gray-600">Manage your daily appointments and reminders</p>
      </div>

      {/* Calendar and Daily Note */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              
              <CalendarIcon className="h-5 w-5" />
              Select Date
              {selectedDate && (
                dateMarking.has(format(selectedDate, "yyyy-MM-dd")) ? (
                  <Button variant="destructive" size="sm" className="px-2 py-1" onClick={() => handleUnmarkDate(selectedDate)}>
                    <Edit2 className="h-3 w-3" />
                    Unmark this day
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="px-2 py-1" onClick={() => handleAddMarkingDate(selectedDate)}>
                    <Edit2 className="h-3 w-3" />
                    Mark this day
                  </Button>
                )
              )}
            </CardTitle>
            
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
              modifiers={{
                weekend: (date) => date.getDay() === 0 || date.getDay() === 6,
                holiday: (date) => holidaySet.has(format(date, "yyyy-MM-dd")),
                customDay: (date) => dateMarking.has(format(date, "yyyy-MM-dd")), 
                appointmentDay:(date) => markAvailableAppointmentDate(date, availabilityRules),
              }}
              modifiersClassNames={{ 
                selected: "bg-gray-300  font-bold",
                weekend: "text-red-500",
                holiday: "border border-red-400 rounded text-red-600",
                customDay: "bg-yellow-200",
                appointmentDay:"bg-green-100",
                today: "border border-blue-500 font-semibold",
                outside: "text-gray-400 opacity-30",   
              }}
            />
          </CardContent>
        </Card>

        {/* Daily Note */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5" />
              Daily Reminder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm font-medium">{format(selectedDate, "EEEE, MMMM d, yyyy")}</div>
              {currentDayData.dailyNote.note ? (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 whitespace-pre-line">{currentDayData.dailyNote.note}</p>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-500">No daily reminder set</p>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => setIsNoteDialogOpen(true)} className="w-full">
                {currentDayData.dailyNote.note ? "Edit Reminder" : "Add Reminder"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appointment Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {format(selectedDate, "MMMM d, yyyy")} - Appointment Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {timeSlots.map((time) => {
              const appointments = getAppointmentsForTime(time)
              const isAvailable = isTimeSlotAvailable(time, selectedDate)

              return (
                <div
                  key={time}
                  className={cn(
                    "flex items-start justify-between p-4 border rounded-lg transition-colors",
                    appointments.length > 0
                      ? "bg-blue-50 border-blue-200"
                      : isAvailable
                        ? "bg-green-50 border-green-200 hover:bg-green-100"
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100",
                  )}
                >
                  <div className="flex items-start gap-4 flex-1">
                    <Badge variant="outline" className={cn("font-mono mt-1 text-sm", isAvailable && "bg-green-100")}>
                      {time}
                    </Badge>

                    <div className="flex-1">
                      {appointments.length > 0 ? (
                        <div className="space-y-3">
                          {appointments.map((appointment) => {
                            const statusConfig = getStatusConfig(appointment.status)
                            return (
                              <AppointmentCard
                                key={appointment.id}
                                appointment={appointment}
                                statusConfig={statusConfig}
                                isEditing={editingAppointment === appointment.id}
                                onEdit={() => setEditingAppointment(appointment.id)}
                                onSave={() => setEditingAppointment(null)}
                                onCancel={() => setEditingAppointment(null)}
                                onDelete={() => openDeleteDialog(appointment.id)}
                                onUpdate={handleUpdateAppointment}
                                onClick={() => handleAppointmentClick(appointment)}
                              />
                            )
                          })}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">
                          {isAvailable ? "Available for booking" : "Not available"}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => openAddDialog(time)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AppointmentDialog
        isOpen={isAppointmentDialogOpen}
        onClose={() => {
          setIsAppointmentDialogOpen(false)
          setSelectedTimeSlot("")
        }}
        onSave={handleAddAppointment}
        timeSlot={selectedTimeSlot}
        customers={customers}
        date={format(selectedDate, "yyyy-MM-dd")}
      />

      <DailyNoteDialog
        isOpen={isNoteDialogOpen}
        onClose={() => setIsNoteDialogOpen(false)}
        onSave={handleSaveDailyNote}
        currentNote={currentDayData.dailyNote}
        date={format(selectedDate, "MMMM d, yyyy")}
      />

      <SettingsDialog
        isOpen={isSettingsDialogOpen}
        onClose={() => setIsSettingsDialogOpen(false)}
        availabilityRules={availabilityRules}
        onSaveRules={setAvailabilityRules}
      />

      <CustomerDetailDialog
        isOpen={isCustomerDetailDialogOpen}
        onClose={() => setIsCustomerDetailDialogOpen(false)}
        customerAppointment={selectedCustomer}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Appointment
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this appointment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => appointmentToDelete && handleDeleteAppointment(appointmentToDelete)}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface AppointmentCardProps {
  appointment: Appointment
  statusConfig: { value: string; label: string; color: string }
  isEditing: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  onDelete: () => void
  onUpdate: (appointmentId: string, field: keyof Appointment, value: string) => void
  onClick: () => void
}

function AppointmentCard({
  appointment,
  statusConfig,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onUpdate,
  onClick,
}: AppointmentCardProps) {
  const [editData, setEditData] = useState(appointment)
  const [phoneError, setPhoneError] = useState("")
  const [formData, setFormData] = useState({
        customerId:"",
        dogId:"",
        customerName: "",
        customerPhone: "",
        customerNote: "",
        dogName: "",
        dogNote: "",
        breed: "",
        todaysNote: "",
        appointmentId:"",
        state: "",
      })
  const [isCustomerCreateDialogOpen, setIsCustomerCreateDialogOpen] = useState(false)
  const [isDogCreateDialogOpen, setIsDogCreateDialogOpen] = useState(false)
  const displayName =
    appointment.quickDetails ||
    (appointment.appointmentCustomerName ? `${appointment.appointmentCustomerName} - ${appointment.appointmentDogName}` : appointment.appointmentDogName) ||
    "Unnamed"

  useEffect(() => {
    setEditData(appointment)
    setPhoneError("")
  }, [appointment])
  
  useEffect(() => {
    if (isCustomerCreateDialogOpen || isDogCreateDialogOpen) {
      setFormData({
        customerId:"",
        dogId:"",
        customerName: editData.appointmentCustomerName || "",
        customerPhone: editData.phone || "",
        customerNote: editData.customerNote || "",
        dogName: editData.appointmentDogName || "",
        dogNote: editData.dogNote || "",
        breed: editData.breed || "",
        todaysNote: editData.todaysNote || "",
        appointmentId: editData.id,
        state: editData.status,
      })

    }
  }, [isCustomerCreateDialogOpen, isDogCreateDialogOpen])

  const handleSave = async () => {
    if (editData.phone && !validatePhone(String(editData.phone))) {
      setPhoneError("Phone must be 8 or 10 digits");
      return;
    }

    if (!editData.appointmentDogName.trim()) {
      return;
    }

    const appointmentChanges: Partial<AppointmentData> = {};

    Object.keys(editData).forEach((key) => {
      const field = key as keyof Appointment;
      if (editData[field] !== appointment[field]) {
       appointmentChanges[field] = editData[field];
      }
    });

    if (Object.keys(appointmentChanges).length > 0) {
      await onUpdate(appointment.id, appointmentChanges);
    }

    onSave();
  };

  const handleStatus = (appointment: any, optionValue: string) => {

    setFormData((prev) => (
      { ...prev, 
      appointmentId: appointment.id,
      state: optionValue, })
    )
    if (optionValue === "P") {
      if (!appointment.customerId) {
        
        setIsCustomerCreateDialogOpen(true)

        // onUpdate(appointment.id, "status", optionValue)
        return
      }
      if (!appointment.dogId) {
        setIsDogCreateDialogOpen(true)
        return
      }
      onUpdate(appointment.id, { status: optionValue })
    }

    if (optionValue !== appointment.status) {
      onUpdate(appointment.id, { status: optionValue })
    }
  }

  const handleCustomerCreate = async (e: React.FormEvent) => {
    try {
      e.preventDefault()
      const createdCustomerData = {
        name: formData.customerName,
        phone: formData.customerPhone,
        customerNote: formData.customerNote,}
      const {id:customerId}=await createCustomer(createdCustomerData)


      appointment = {
        ...appointment,
        customerId,
        customerName: formData.customerName,
        customerNote: formData.customerNote,
      };

      onUpdate(formData.appointmentId, {"customerId": customerId})
      setIsCustomerCreateDialogOpen(false)
      setIsDogCreateDialogOpen(true)
    } catch (error) {
      console.error("Error creating customer:", error)
      // Handle error (e.g., show notification)
    }
  }
  const handleDogCreate = async (e: React.FormEvent) => {
    try {
      e.preventDefault()
      const createdDogData = {
        dog_name: formData.dogName,
        dog_note: formData.dogNote,
        dog_breed: formData.breed,
        customerId: editData.customerId,
      }

      const {id:dogId} = await createDog(createdDogData)

      appointment.dogId = dogId

      onUpdate(formData.appointmentId, {"dogId": dogId})
      onUpdate(formData.appointmentId, {"status": "P"})
      setIsDogCreateDialogOpen(false)
  } catch (error) {
      console.error("Error creating dog:", error)
      // Handle error (e.g., show notification)
    }
  }

  const StatusSelector = ({ currentStatus }: { currentStatus: Appointment["status"] }) => {
    const [isOpen, setIsOpen] = useState(false)
    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen(!isOpen)
          }}
          className={cn("text-xs", statusConfig.color)}
        >
          {currentStatus === "no-status" ? "Set Status" : `${currentStatus} - ${statusConfig.label}`}
        </Button>

        {isOpen && (
          <div className="absolute top-full left-0 z-10 mt-1 bg-white border rounded-md shadow-lg">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                className="block w-full px-3 py-2 text-left text-xs hover:bg-gray-100"
                onClick={(e) => {
                  e.stopPropagation()
                  handleStatus(appointment, option.value)
                  // onUpdate(appointment.id, "status", option.value)
                  setIsOpen(false)
                }}
              >
                {option.value === "no-status" ? option.label : `${option.value} - ${option.label}`}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className={cn("p-3 border rounded-lg", statusConfig.color)}>
        <div className="space-y-3">
          {/* Previous Services Reference (Read-only) */}
          {appointment.previousServices && (
            <div className="p-2 bg-gray-50 rounded border ">
              <Label className="text-xs text-gray-600">Previous Services (Reference)</Label>
              <div className="text-sm text-gray-700 ">{appointment.previousServices}</div>
              {appointment.previousPrice && (
                <div className="text-sm text-gray-700">Previous Price: ${appointment.previousPrice}</div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Owner Name</Label>
              <Input
                value={editData.appointmentCustomerName}
                onChange={(e) => setEditData((prev) => ({ ...prev, appointmentCustomerName: e.target.value }))}
                className="h-8 text-sm"
                placeholder="Optional"
              />
            </div>
            <div>
              <Label className="text-xs">Dog Name *</Label>
              <Input
                value={editData.appointmentDogName}
                onChange={(e) => setEditData((prev) => ({ ...prev, appointmentDogName: e.target.value }))}
                className="h-8 text-sm"
                placeholder="Required"
                required
              />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input
                value={editData.phone}
                onChange={(e) => {
                  setEditData((prev) => ({ ...prev, phone: e.target.value }))
                  setPhoneError("")
                }}
                className={cn("h-8 text-sm", phoneError && "border-red-500")}
                placeholder="8 or 10 digits"
              />
              {phoneError && <div className="text-xs text-red-500 mt-1">{phoneError}</div>}
            </div>
            <div>
              <Label className="text-xs">Today's Services</Label>
              <Input
                value={editData.todaysServices}
                onChange={(e) => setEditData((prev) => ({ ...prev, todaysServices: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Today's Price</Label>
              <Input
                type="number"
                value={editData.todaysPrice}
                onChange={(e) => setEditData((prev) => ({ ...prev, todaysPrice: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Today's Note</Label>
              <Textarea
                value={editData.todaysNote}
                onChange={(e) => setEditData((prev) => ({ ...prev, todaysNote: e.target.value }))}
                className="text-sm"
                rows={2}
                placeholder="Notes for today's appointment"
              />
            </div>
            <div>
              <Label className="text-xs">General Note</Label>
              <Textarea
                value={editData.customerNote}
                onChange={(e) => setEditData((prev) => ({ ...prev, customerNote: e.target.value }))}
                className="text-sm"
                rows={2}
                placeholder="General customer notes"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={onCancel}>
              <X className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleSave}>
              <Check className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn("p-3 border rounded-lg cursor-pointer hover:shadow-md transition-shadow", statusConfig.color)}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span className="font-medium">{displayName}</span>
          <StatusSelector currentStatus={appointment.status} />
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
        {appointment.phone && (
          <div className="break-words whitespace-normal">
            <span className="font-medium">Phone:</span> {Array.isArray(appointment.phone) ? appointment.phone.join(", ") : appointment.phone}
          </div>
        )}
        {appointment.previousServices && (
          <div className="break-words whitespace-normal">
            <span className="font-medium">Previous Services:</span> {appointment.previousServices}
          </div>
        )}
        {appointment.previousPrice && (
          <div>
            <span className="font-medium">Previous Price:</span> ${appointment.previousPrice}
          </div>
        )}
        {appointment.todaysServices && (
          <div className="break-words whitespace-normal">
            <span className="font-medium">Today's Services:</span> {appointment.todaysServices}
          </div>
        )}
        {appointment.todaysPrice && (
          <div>
            <span className="font-medium">Today's Price:</span> ${appointment.todaysPrice}
          </div>
        )}
      </div>

      {(appointment.todaysNote || appointment.customerNote) && (
        <div className="mt-2 text-xs space-y-1">
          {appointment.todaysNote && (
            <div>
              <span className="font-medium">Today's Note:</span> {appointment.todaysNote}
            </div>
          )}
          {appointment.customerNote && (
            <div>
              <span className="font-medium">General Note:</span> {appointment.customerNote}
            </div>
          )}
        </div>
      )}

      {/*  Customer Create Dialog */}
      <Dialog open={isCustomerCreateDialogOpen} onOpenChange={setIsCustomerCreateDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCustomerCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Owner Name</Label>
                <Input id="name" 
                  value={formData.customerName} 
                  onChange={(e) => setFormData((prev) => ({ ...prev, customerName: e.target.value }))} 
                  placeholder="Optional" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, customerPhone: e.target.value }))}
                  placeholder="8 or 10 digits"
                  className={phoneError ? "border-red-500" : ""}
                />
                {phoneError && <div className="text-sm text-red-500 mt-1">{phoneError}</div>}
              </div>
              <div>
                <Label className="text-xs">Customer's Note</Label>
                <Textarea
                  value={formData.customerNote}
                  onChange={(e) => setFormData((prev) => ({ ...prev, customerNote: e.target.value }))}
                  className="text-sm"
                  rows={2}
                  placeholder="Notes for today's appointment"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCustomerCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Add Customer</Button>

            </div>
          </form>
        </DialogContent>
      </Dialog>


      {/*  dog Create Dialog */}
      <Dialog open={isDogCreateDialogOpen} onOpenChange={setIsDogCreateDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Add Dog</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDogCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Dog Name</Label>
                <Input id="name" 
                  value={formData.dogName} 
                  onChange={(e) => setFormData((prev) => ({ ...prev, dogName: e.target.value }))} 
                  placeholder="Dog Name" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="breed">Breed</Label>
                <Input
                  id="breed"
                  value={formData.breed}
                  onChange={(e) => setFormData((prev) => ({ ...prev, breed: e.target.value }))}
                  placeholder="breed"
                />
                {phoneError && <div className="text-sm text-red-500 mt-1">{phoneError}</div>}
              </div>
              <div>
                <Label className="text-xs">Dog's Note</Label>
                <Textarea
                  value={formData.dogNote}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dogNote: e.target.value }))}
                  className="text-sm"
                  rows={2}
                  placeholder="Notes for today's appointment"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDogCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Add Dog</Button>

            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>

    
  )
}

interface CustomerCardProps {
  customer: CustomerData
  dog?: DogData
  onSelect: (customer: CustomerData) => void
}

function CustomerCard({ customer, dog, onSelect }: CustomerCardProps) {
  return (
    <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => onSelect(customer)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <User className="h-4 w-4 text-blue-600" />
          <span className="font-medium">
            {customer.name ? `${customer.name} - ${dog.name}` : `${dog.name} (No Owner)`}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
          <div>
            <span className="font-medium">Phone:</span> {Array.isArray(customer.phone) ? customer.phone.join(", ") : customer.phone}
          </div>
          <div className="col-span-2 break-words whitespace-normal">
            <span className="font-medium">Previous Services:</span> ${dog.previousServices}
          </div>
          <div>
            <span className="font-medium">Previous Price:</span> ${dog.previousPrice}
          </div>
        </div>

        {customer.customerNote && (
          <div className="mt-2 text-sm">
            <span className="font-medium whitespace-normal">General Note:</span> {customer.customerNote}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface AppointmentDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (appointment: Omit<Appointment, "id">) => void
  timeSlot: string
  customers: CustomerData[]
}

function AppointmentDialog({ isOpen, onClose, onSave, timeSlot, customers, date }: AppointmentDialogProps) {
  const [isQuickEntry, setIsQuickEntry] = useState(true)
  const [searchPhone, setSearchPhone] = useState("")
  const [foundCustomers, setFoundCustomers] = useState<CustomerData[]>([])
  const [phoneError, setPhoneError] = useState("")
  const [formData, setFormData] = useState({
    quickDetails: "",
    name: "",
    dogName: "",
    phone: "",
    customerNote: "",
    todaysNote: "",
    previousServices: "",
    previousPrice: "",
    todaysServices: "",
    todaysPrice: "",
    status: "no-status" as Appointment["status"],
  })

  // Search customers by quick details or phone
  useEffect(() => {
    const fetchMatchingCustomers = async () => {
      const searchTerm = searchPhone
      if (searchTerm.length >= 3) {
        try {
          const results = await searchCustomers(searchTerm)
          setFoundCustomers(results)
        } catch (error) {
          console.error("Failed to search customers:", error)
          setFoundCustomers([])
        }
      } else {
        setFoundCustomers([])
      }
    }
    fetchMatchingCustomers()
  }, [formData.quickDetails, searchPhone, isQuickEntry])

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        quickDetails: "",
        name: "",
        dogName: "",
        breed: "",
        phone: "",
        customerNote: "",
        todaysNote: "",
        previousServices: "",
        previousPrice: "",
        todaysServices: "",
        todaysPrice: "",
        status: "no-status",
      })
      setSearchPhone("")
      setFoundCustomers([])
      setPhoneError("")
    }
  }, [isOpen])


  const handleCustomerSelect = (
    customer: CustomerData,
    dog: DogData,
    index: number
  ) => {
    const phoneMatchForAppointment = customer.phone.find((p) => p.includes(searchPhone)) || ""
    
    setFormData((prev) => ({
      ...prev,
      name: customer.name,
      dogs: customer.dogs,
      dogName: dog.name,
      dogId: dog.id,
      breed: dog.breed,
      phone: phoneMatchForAppointment || customer.phone[0],
      customerNote: customer.generalNote,
      previousServices: dog.previousServices,
      previousPrice: dog.previousPrice,
      todaysServices: dog.previousServices,
      todaysPrice: dog.previousPrice,
    }))
    setSearchPhone("")
    

    setFoundCustomers([])
  }
  const parseInput = (input: string) => {
    const trimmedInput = input.trim()

    // 抓出電話號碼（8~10位數字）
    const phoneMatch = trimmedInput.match(/\d{1,10}/)
    const phone = phoneMatch ? phoneMatch[0] : ""

    // 去掉電話號碼後的字串
    const textWithoutPhone = phone ? trimmedInput.replace(phone, "").trim() : trimmedInput

    let customerName = ""
    let dogName = ""

    if (textWithoutPhone.includes("-")) {
      const parts = textWithoutPhone.split("-", 2)
      customerName = parts[1].trim()
      dogName = parts[0].trim()
    } else if (textWithoutPhone.includes(" ")) {
      const parts = textWithoutPhone.split(" ", 2)
      customerName = parts[1].trim()
      dogName = parts[0].trim()
    } else {
      dogName = textWithoutPhone
    }

    if (customerName || dogName || phone) {
          setFormData((prev) => ({
      ...prev,
      name: customerName|| "",
      dogName: dogName || "",
      phone: phone || "",
      }))
    }
    }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // if (isQuickEntry && !formData.quickDetails.trim()) return


    // Validate required dog name
    if (!formData.dogName.trim()) return

    // Validate phone if provided
    if (formData.phone && !validatePhone(String(formData.phone))) {
      setPhoneError("Phone must be 8 or 10 digits")
      return
    }
    

    onSave({
      date: date,
      time: timeSlot,
      quickDetails: isQuickEntry ? formData.quickDetails : undefined,
      customerName: formData.name,
      dogName: formData.dogName,
      breed: formData.breed,
      phone: formData.phone,
      customerNote: formData.customerNote,
      todaysNote: formData.todaysNote,
      previousServices: formData.previousServices,
      previousPrice: formData.previousPrice,
      todaysServices: formData.todaysServices,
      todaysPrice: formData.todaysPrice,
      status: formData.status,
    })

    setFormData({
      quickDetails: "",
      name: "",
      dogName: "",
      breed: "",
      phone: "",
      customerNote: "",
      todaysNote: "",
      previousServices: "",
      previousPrice: "",
      todaysServices: "",
      todaysPrice: "",
      status: "no-status",
    })
  }
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Appointment - {timeSlot}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Search */}
          <div className="space-y-4">
            
            <>
              <div>
                <Label htmlFor="search">Search Customer</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    value={searchPhone}
                    onChange={(e) => {
                      setSearchPhone(e.target.value)
                      parseInput(e.target.value)
                    }}
                    placeholder="Search by phone, name, or dog name..."
                    className="pl-10"
                  />
                </div>
              </div>
            </>
            

            {foundCustomers.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                <Label>Found Customers</Label>
                {foundCustomers.map((customer) => (
                  customer.dogs.map((dog, index) => (
                    <CustomerCard key={dog.id} customer={customer} dog={dog} onSelect={() => handleCustomerSelect(customer, dog, index)} />
                  ))
                ))}
              </div>
            )}
          </div>

          {/* Appointment Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <>
              {/* Previous Services Reference */}
              {formData.previousServices && (
                <div className="p-3 bg-gray-50 rounded border break-words whitespace-normal">
                  <Label className="text-sm text-gray-600">Previous Services (Reference)</Label>
                  <div className="text-sm text-gray-700">{formData.previousServices}</div>
                  {formData.previousPrice && (
                    <div className="text-sm text-gray-700">Previous Price: ${formData.previousPrice}</div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Owner Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, phone: e.target.value }))
                      setPhoneError("")
                    }}
                    placeholder="8 or 10 digits"
                    className={phoneError ? "border-red-500" : ""}
                  />
                  {phoneError && <div className="text-sm text-red-500 mt-1">{phoneError}</div>}
                </div>
                <div>
                  <Label htmlFor="dogName">Dog Name *</Label>
                  <Input
                    id="dogName"
                    value={formData.dogName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, dogName: e.target.value }))}
                    placeholder="Required"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="breed">Dog Breed</Label>
                  <Input
                    id="breed"
                    value={formData.breed}
                    onChange={(e) => setFormData((prev) => ({ ...prev, breed: e.target.value }))}
                    placeholder="bread"
                  />
                </div>

              </div>
            </>


            {/* Today's Services and Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="todaysServices">Today's Services</Label>
                <Input
                  id="todaysServices"
                  value={formData.todaysServices}
                  onChange={(e) => setFormData((prev) => ({ ...prev, todaysServices: e.target.value }))}
                  placeholder="Today's services"
                />
              </div>
              <div>
                <Label htmlFor="todaysPrice">Today's Price</Label>
                <Input
                  id="todaysPrice"
                  type="number"
                  value={formData.todaysPrice}
                  onChange={(e) => setFormData((prev) => ({ ...prev, todaysPrice: e.target.value }))}
                  placeholder="Today's price"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="todaysNote">Today's Note</Label>
                <Textarea
                  id="todaysNote"
                  value={formData.todaysNote}
                  onChange={(e) => setFormData((prev) => ({ ...prev, todaysNote: e.target.value }))}
                  placeholder="Notes for today's appointment"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="customerNote">General Note</Label>
                <Textarea
                  id="customerNote"
                  value={formData.customerNote}
                  onChange={(e) => setFormData((prev) => ({ ...prev, customerNote: e.target.value }))}
                  placeholder="General customer notes"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Add Appointment</Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface CustomerDetailDialogProps {
  isOpen: boolean
  onClose: () => void
  customerAppointment: AppointmentData | null
}

function CustomerDetailDialog({ isOpen, onClose, customerAppointment }: CustomerDetailDialogProps) {
  if (!customerAppointment) return null

  const { customerName, dogName, customerPhone:customerPhone, previousServices, customerNote, serviceHistory } = customerAppointment
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {customerName ? `${customerName} - ${dogName}` : dogName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Owner Name</Label>
                  <p className="text-sm text-gray-700 break-words whitespace-normal">{customerName || "Not provided"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Dog Name</Label>
                  <p className="text-sm text-gray-700 break-words whitespace-normal">{dogName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Phone</Label>
                  <p className="text-sm text-gray-700 break-words whitespace-normal">{Array.isArray(customerPhone) ? customerPhone.join(", ") : customerPhone}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Latest Service</Label>
                  <p className="text-sm text-gray-700 break-words whitespace-normal">{previousServices}</p>
                </div>
              </div>

              {customerNote && (
                <div>
                  <Label className="text-sm font-medium">General Notes</Label>
                  <p className="text-sm text-gray-700 break-words whitespace-normal">{customerNote}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="h-5 w-5" />
                Service History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {serviceHistory?.map((service) => (
                  <div key={service.id} className="p-3 border rounded-lg">
                    <div className="grid grid-cols-4 gap-2 items-start">
                      <div className="col-span-3 font-medium break-words">{service.dog_name}</div>
                      <div className="col-span-3 font-medium break-words">{service.service}</div>
                      <div className="text-sm text-gray-500 text-right">{format(new Date(service.service_date), "MMM d, yyyy")}</div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-600">{service.service_note}</div>
                      <div className="font-medium text-green-600">${service.service_price}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
  availabilityRules: AvailabilityRule[]
  onSaveRules: (rules: AvailabilityRule[]) => void
}

function SettingsDialog({ isOpen, onClose, availabilityRules, onSaveRules }: SettingsDialogProps) {
  const [rules, setRules] = useState<AvailabilityRule[]>(availabilityRules)
  const [newRule, setNewRule] = useState({
    type: "weekly" as "weekly" | "specific",
    dayOfWeek: 1,
    specificDate: "",
    time: "09:00",
  })

  useEffect(() => {
    setRules(availabilityRules)
  }, [availabilityRules])

  const addRule = () => {
    const rule: AvailabilityRule = {
      id: Date.now().toString(),
      type: newRule.type,
      dayOfWeek: newRule.type === "weekly" ? newRule.dayOfWeek : undefined,
      specificDate: newRule.type === "specific" ? newRule.specificDate : undefined,
      time: newRule.time,
      isEnabled: true,
    }

    setRules((prev) => [...prev, rule])
    setNewRule({
      type: "weekly",
      dayOfWeek: 1,
      specificDate: "",
      time: "09:00",
    })
  }

  const toggleRule = (ruleId: string) => {
    setRules((prev) => prev.map((rule) => (rule.id === ruleId ? { ...rule, isEnabled: !rule.isEnabled } : rule)))
  }

  const deleteRule = (ruleId: string) => {
    setRules((prev) => prev.filter((rule) => rule.id !== ruleId))
  }

  const handleSave = async () => {
    try {
      await saveAvailabilityRules(rules) // ← 儲存到資料庫
      onSaveRules(rules)                 // ← 更新父元件狀態（前端畫面立即更新）
      onClose()                          // ← 關閉對話框
    } catch (error) {
      console.error("Failed to save rules:", error)
      alert("儲存失敗，請稍後再試")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Appointment Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="availability" className="w-full">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="availability">Availability Rules</TabsTrigger>
          </TabsList>

          <TabsContent value="availability" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Add New Availability Rule</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  <Select
                    value={newRule.type}
                    onValueChange={(value) => setNewRule((prev) => ({ ...prev, type: value as "weekly" | "specific" }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="specific">Specific Date</SelectItem>
                    </SelectContent>
                  </Select>

                  {newRule.type === "weekly" ? (
                    <Select
                      value={newRule.dayOfWeek.toString()}
                      onValueChange={(value) => setNewRule((prev) => ({ ...prev, dayOfWeek: Number.parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dayNames.map((day, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type="date"
                      value={newRule.specificDate}
                      onChange={(e) => setNewRule((prev) => ({ ...prev, specificDate: e.target.value }))}
                    />
                  )}

                  <Input
                    type="time"
                    value={newRule.time}
                    onChange={(e) => setNewRule((prev) => ({ ...prev, time: e.target.value }))}
                  />

                  <Button onClick={addRule} size="sm">
                    Add
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">Current Rules</Label>
                {rules.length === 0 ? (
                  <p className="text-sm text-gray-500">No availability rules set. All time slots are unavailable.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {rules.map((rule) => (
                      <div
                        key={rule.id}
                        className={cn(
                          "flex items-center justify-between p-3 border rounded-lg",
                          rule.isEnabled ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={rule.isEnabled}
                            onChange={() => toggleRule(rule.id)}
                            className="rounded"
                          />
                          <div>
                            <div className="font-medium">
                              {rule.type === "weekly"
                                ? `Every ${dayNames[rule.dayOfWeek!]} at ${rule.time}`
                                : `${rule.specificDate} at ${rule.time}`}
                            </div>
                            <div className="text-sm text-gray-500">
                              {rule.type === "weekly" ? "Recurring weekly" : "One-time"}
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => deleteRule(rule.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save Settings</Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

interface DailyNoteDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (note: string) => void
  currentNote: {
  id: string
  note: string}
  date: string
}

function DailyNoteDialog({ isOpen, onClose, onSave, currentNote, date }: DailyNoteDialogProps) {
  const [note, setNote] = useState("")

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setNote(currentNote.note)
    }
  }, [isOpen, currentNote])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(note.trim())
  }
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Daily Reminder - {date}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="note">Reminder Note</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter your daily reminder or notes..."
              rows={4}
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

