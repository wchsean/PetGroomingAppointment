'use client'

import type React from 'react'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleLeft, ToggleRight, Plus } from 'lucide-react'
import { CustomerSearch } from './customer-search'
import { getTimeSlotsByDate, createTimeSlot } from '@/lib/api-client'
import type {
  CustomerData,
  DogData,
  AppointmentData,
  TimeSlotData,
} from '@/types'
import { format } from 'date-fns'

interface AppointmentDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (appointment: Omit<AppointmentData, 'id'>) => void
  timeSlot: string
  date: string
}

export function AppointmentDialog({
  isOpen,
  onClose,
  onSave,
  timeSlot,
  date,
}: AppointmentDialogProps) {
  const [activeTab, setActiveTab] = useState('timeslot')
  const [isQuickEntry, setIsQuickEntry] = useState(true)
  const [phoneError, setPhoneError] = useState('')
  const [timeSlots, setTimeSlots] = useState<TimeSlotData[]>([])
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlotData | null>(
    null,
  )
  const [isCreatingNewSlot, setIsCreatingNewSlot] = useState(false)
  const [newSlotTime, setNewSlotTime] = useState('')
  const [newSlotLimit, setNewSlotLimit] = useState('999')

  const [formData, setFormData] = useState({
    quickDetails: '',
    customerName: '',
    dogName: '',
    phone: '',
    dogNote: '',
    dogAppearance: '',
    customerNote: '',
    todaysNote: '',
    previousServices: '',
    previousPrice: '',
    todaysServices: '',
    todaysPrice: '',
    status: 'no-status' as AppointmentData['status'],
  })

  // Load timeslots on dialog open
  useEffect(() => {
    if (isOpen && date) {
      loadTimeSlots()
      resetForm()
    }
  }, [isOpen, date])

  // Set initial selected timeslot if timeSlot prop is provided
  useEffect(() => {
    if (timeSlot && timeSlots.length > 0) {
      const slot = timeSlots.find((s) => s.slot_time === timeSlot)
      if (slot) {
        setSelectedTimeSlot(slot)
        setActiveTab('quick')
      }
    }
  }, [timeSlot, timeSlots])

  const loadTimeSlots = async () => {
    try {
      const slots = await getTimeSlotsByDate(new Date(date))
      setTimeSlots(slots)
    } catch (error) {
      console.error('Failed to load timeslots:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      quickDetails: '',
      customerName: '',
      dogName: '',
      phone: '',
      dogNote: '',
      dogAppearance: '',
      customerNote: '',
      todaysNote: '',
      previousServices: '',
      previousPrice: '',
      todaysServices: '',
      todaysPrice: '',
      status: 'no-status',
    })
    setPhoneError('')
    setIsQuickEntry(true)
    setIsCreatingNewSlot(false)
    setNewSlotTime('')
    setNewSlotLimit('999')
  }

  const handleCreateNewSlot = async () => {
    if (!newSlotTime.trim()) {
      alert('Please enter a time')
      return
    }

    try {
      const newSlot = await createTimeSlot({
        slot_date: date,
        slot_time: newSlotTime,
        slot_type: 'any',
        appointment_limit: parseInt(newSlotLimit) || 999,
        is_enabled: true,
      })
      setSelectedTimeSlot(newSlot)
      await loadTimeSlots()
      setIsCreatingNewSlot(false)
      setNewSlotTime('')
      setNewSlotLimit('999')
      setActiveTab('quick')
    } catch (error) {
      console.error('Failed to create timeslot:', error)
      alert('Failed to create timeslot')
    }
  }

  const handleCustomerSelect = (customer: CustomerData) => {
    if (customer.dogs.length === 1) {
      const dog = customer.dogs[0]
      setFormData((prev) => ({
        ...prev,
        quickDetails: `${customer.name} - ${dog.name}`,
        customerName: customer.name,
        dogName: dog.name,
        phone: customer.phone,
        dogNote: dog.note,
        dogAppearance: dog.appearance || '',
        customerNote: customer.generalNote,
        previousServices: dog.previousServices,
        previousPrice: dog.previousPrice,
        todaysServices: dog.previousServices,
        todaysPrice: dog.previousPrice,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        customerName: customer.name,
        phone: customer.phone,
        customerNote: customer.generalNote,
      }))
    }

    setActiveTab('details')
  }

  const handleDogSelect = (
    dog: DogData & { customerName: string; customerPhone: string },
  ) => {
    setFormData((prev) => ({
      ...prev,
      quickDetails: `${dog.customerName} - ${dog.name}`,
      customerName: dog.customerName,
      dogName: dog.name,
      phone: dog.customerPhone,
      dogNote: dog.note,
      dogAppearance: dog.appearance || '',
      previousServices: dog.previousServices,
      previousPrice: dog.previousPrice,
      todaysServices: dog.previousServices,
      todaysPrice: dog.previousPrice,
    }))

    setActiveTab('details')
  }

  const validatePhone = (phone: string): boolean => {
    const cleanPhone = phone.replace(/\D/g, '')
    return (
      cleanPhone.length === 8 ||
      cleanPhone.length === 10 ||
      cleanPhone.length === 0
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedTimeSlot) {
      alert('Please select a timeslot')
      return
    }

    if (isQuickEntry && !formData.quickDetails.trim()) return

    if (!isQuickEntry) {
      if (!formData.dogName.trim()) return

      if (formData.phone && !validatePhone(formData.phone)) {
        setPhoneError('Phone must be 8 or 10 digits')
        return
      }
    }

    onSave({
      time: selectedTimeSlot.slot_time,
      quickDetails: isQuickEntry ? formData.quickDetails : undefined,
      customerName: formData.customerName,
      dogName: formData.dogName,
      phone: formData.phone,
      dogNote: formData.dogNote,
      dogAppearance: formData.dogAppearance,
      customerNote: formData.customerNote,
      todaysNote: formData.todaysNote,
      previousServices: formData.previousServices,
      previousPrice: formData.previousPrice,
      todaysServices: formData.todaysServices,
      todaysPrice: formData.todaysPrice,
      status: formData.status,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Appointment - {date}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timeslot">
              Timeslot {selectedTimeSlot && `(${selectedTimeSlot.slot_time})`}
            </TabsTrigger>
            <TabsTrigger value="quick">Quick Search</TabsTrigger>
            <TabsTrigger value="details">Appointment Details</TabsTrigger>
          </TabsList>

          {/* Timeslot Selection Tab */}
          <TabsContent value="timeslot" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold mb-3 block">
                  Select or Create Timeslot
                </Label>

                {!isCreatingNewSlot ? (
                  <>
                    <div className="grid grid-cols-3 gap-2 mb-4 max-h-80 overflow-y-auto">
                      {timeSlots.map((slot) => {
                        const bookedCount = slot.booked_count || 0
                        const availableCount = Math.max(
                          0,
                          slot.capacity - bookedCount,
                        )
                        const isFull = bookedCount >= slot.capacity
                        const isSelected = selectedTimeSlot?.id === slot.id

                        return (
                          <Button
                            key={slot.id}
                            variant={isSelected ? 'default' : 'outline'}
                            className={`h-auto py-3 flex flex-col items-center gap-1 ${
                              isFull ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            onClick={() => !isFull && setSelectedTimeSlot(slot)}
                            disabled={isFull}
                          >
                            <div className="text-sm font-mono">
                              {slot.slot_time}
                            </div>
                            <div className="text-xs">
                              {bookedCount}/{slot.capacity}
                            </div>
                            <div className="text-xs text-gray-500">
                              {slot.slot_type}
                            </div>
                          </Button>
                        )
                      })}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => setIsCreatingNewSlot(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Timeslot
                    </Button>
                  </>
                ) : (
                  <div className="border rounded-lg p-4 space-y-4">
                    <div>
                      <Label htmlFor="newSlotTime">Time</Label>
                      <Input
                        id="newSlotTime"
                        type="time"
                        value={newSlotTime}
                        onChange={(e) => setNewSlotTime(e.target.value)}
                        placeholder="HH:MM"
                      />
                    </div>
                    <div>
                      <Label htmlFor="newSlotLimit">Appointment Limit</Label>
                      <Input
                        id="newSlotLimit"
                        type="number"
                        value={newSlotLimit}
                        onChange={(e) => setNewSlotLimit(e.target.value)}
                        min="1"
                        placeholder="999"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreatingNewSlot(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleCreateNewSlot}
                        className="flex-1"
                      >
                        Create Timeslot
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {selectedTimeSlot && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm font-semibold text-blue-900">
                    Selected: {selectedTimeSlot.slot_time}
                  </div>
                  <div className="text-xs text-blue-700 mt-1">
                    Available:{' '}
                    {Math.max(
                      0,
                      selectedTimeSlot.capacity -
                        (selectedTimeSlot.booked_count || 0),
                    )}{' '}
                    / {selectedTimeSlot.capacity}
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                onClick={() => selectedTimeSlot && setActiveTab('quick')}
                disabled={!selectedTimeSlot}
              >
                Next: Select Customer
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="quick" className="space-y-4 pt-4">
            <CustomerSearch
              onSelectCustomer={handleCustomerSelect}
              onSelectDog={handleDogSelect}
            />
          </TabsContent>

          <TabsContent value="details" className="space-y-4 pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Toggle between Quick Entry and Detailed Entry */}
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsQuickEntry(!isQuickEntry)}
                  className="flex items-center gap-2"
                >
                  {isQuickEntry ? (
                    <ToggleLeft className="h-4 w-4" />
                  ) : (
                    <ToggleRight className="h-4 w-4" />
                  )}
                  {isQuickEntry ? 'Quick Entry' : 'Detailed Entry'}
                </Button>
                <span className="text-sm text-gray-600">
                  {isQuickEntry
                    ? 'Switch to detailed form'
                    : 'Switch to quick entry'}
                </span>
              </div>

              {isQuickEntry ? (
                <div>
                  <Label htmlFor="quickDetails">Quick Details</Label>
                  <Input
                    id="quickDetails"
                    value={formData.quickDetails}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        quickDetails: e.target.value,
                      }))
                    }
                    placeholder="Customer - Dog"
                    required
                    autoFocus
                  />
                </div>
              ) : (
                <>
                  {/* Previous Services Reference */}
                  {formData.previousServices && (
                    <div className="p-3 bg-gray-50 rounded border">
                      <Label className="text-sm text-gray-600">
                        Previous Services (Reference)
                      </Label>
                      <div className="text-sm text-gray-700">
                        {formData.previousServices}
                      </div>
                      {formData.previousPrice && (
                        <div className="text-sm text-gray-700">
                          Previous Price: ${formData.previousPrice}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customerName">Customer Name</Label>
                      <Input
                        id="customerName"
                        value={formData.customerName}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            customerName: e.target.value,
                          }))
                        }
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dogName">Dog Name *</Label>
                      <Input
                        id="dogName"
                        value={formData.dogName}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            dogName: e.target.value,
                          }))
                        }
                        placeholder="Required"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                          setPhoneError('')
                        }}
                        placeholder="8 or 10 digits"
                        className={phoneError ? 'border-red-500' : ''}
                      />
                      {phoneError && (
                        <div className="text-sm text-red-500 mt-1">
                          {phoneError}
                        </div>
                      )}
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="dogAppearance">Dog Appearance</Label>
                      <Textarea
                        id="dogAppearance"
                        value={formData.dogAppearance}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            dogAppearance: e.target.value,
                          }))
                        }
                        placeholder="e.g., Golden retriever with brown and white spots"
                        rows={2}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Today's Services and Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="todaysServices">Today's Services</Label>
                  <Input
                    id="todaysServices"
                    value={formData.todaysServices}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        todaysServices: e.target.value,
                      }))
                    }
                    placeholder="Today's services"
                  />
                </div>
                <div>
                  <Label htmlFor="todaysPrice">Today's Price</Label>
                  <Input
                    id="todaysPrice"
                    value={formData.todaysPrice}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        todaysPrice: e.target.value,
                      }))
                    }
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
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        todaysNote: e.target.value,
                      }))
                    }
                    placeholder="Notes for today's appointment"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="customerNote">Customer Note</Label>
                  <Textarea
                    id="customerNote"
                    value={formData.customerNote}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        customerNote: e.target.value,
                      }))
                    }
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
