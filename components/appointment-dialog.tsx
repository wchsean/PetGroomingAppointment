"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleLeft, ToggleRight } from "lucide-react"
import { CustomerSearch } from "./customer-search"
import type { CustomerData, DogData, AppointmentData } from "@/types"

interface AppointmentDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (appointment: Omit<AppointmentData, "id">) => void
  timeSlot: string
}

export function AppointmentDialog({ isOpen, onClose, onSave, timeSlot }: AppointmentDialogProps) {
  const [activeTab, setActiveTab] = useState("quick")
  const [isQuickEntry, setIsQuickEntry] = useState(true)
  const [phoneError, setPhoneError] = useState("")
  const [formData, setFormData] = useState({
    quickDetails: "",
    customerName: "",
    dogName: "",
    phone: "",
    dogNote: "",
    customerNote: "",
    todaysNote: "",
    previousServices: "",
    previousPrice: "",
    todaysServices: "",
    todaysPrice: "",
    status: "no-status" as AppointmentData["status"],
  })

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        quickDetails: "",
        customerName: "",
        dogName: "",
        phone: "",
        dogNote: "",
        customerNote: "",
        todaysNote: "",
        previousServices: "",
        previousPrice: "",
        todaysServices: "",
        todaysPrice: "",
        status: "no-status",
      })
      setPhoneError("")
      setIsQuickEntry(true)
      setActiveTab("quick")
    }
  }, [isOpen])

  const handleCustomerSelect = (customer: CustomerData) => {
    if (customer.dogs.length === 1) {
      // If customer has only one dog, auto-select it
      const dog = customer.dogs[0]
      setFormData((prev) => ({
        ...prev,
        quickDetails: `${customer.name} - ${dog.name}`,
        customerName: customer.name,
        dogName: dog.name,
        phone: customer.phone,
        dogNote: dog.note,
        customerNote: customer.generalNote,
        previousServices: dog.previousServices,
        previousPrice: dog.previousPrice,
        todaysServices: dog.previousServices,
        todaysPrice: dog.previousPrice,
      }))
    } else {
      // Just set customer info, user will need to select a dog
      setFormData((prev) => ({
        ...prev,
        customerName: customer.name,
        phone: customer.phone,
        customerNote: customer.generalNote,
      }))
    }

    setActiveTab("details")
  }

  const handleDogSelect = (dog: DogData & { customerName: string; customerPhone: string }) => {
    setFormData((prev) => ({
      ...prev,
      quickDetails: `${dog.customerName} - ${dog.name}`,
      customerName: dog.customerName,
      dogName: dog.name,
      phone: dog.customerPhone,
      dogNote: dog.note,
      previousServices: dog.previousServices,
      previousPrice: dog.previousPrice,
      todaysServices: dog.previousServices,
      todaysPrice: dog.previousPrice,
    }))

    setActiveTab("details")
  }

  const validatePhone = (phone: string): boolean => {
    const cleanPhone = phone.replace(/\D/g, "")
    return cleanPhone.length === 8 || cleanPhone.length === 10 || cleanPhone.length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (isQuickEntry && !formData.quickDetails.trim()) return

    if (!isQuickEntry) {
      // Validate required dog name
      if (!formData.dogName.trim()) return

      // Validate phone if provided
      if (formData.phone && !validatePhone(formData.phone)) {
        setPhoneError("Phone must be 8 or 10 digits")
        return
      }
    }

    onSave({
      time: timeSlot,
      quickDetails: isQuickEntry ? formData.quickDetails : undefined,
      customerName: formData.customerName,
      dogName: formData.dogName,
      phone: formData.phone,
      dogNote: formData.dogNote,
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
          <DialogTitle>Add Appointment - {timeSlot}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quick">Quick Search</TabsTrigger>
            <TabsTrigger value="details">Appointment Details</TabsTrigger>
          </TabsList>

          <TabsContent value="quick" className="space-y-4 pt-4">
            <CustomerSearch onSelectCustomer={handleCustomerSelect} onSelectDog={handleDogSelect} />
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
                  {isQuickEntry ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
                  {isQuickEntry ? "Quick Entry" : "Detailed Entry"}
                </Button>
                <span className="text-sm text-gray-600">
                  {isQuickEntry ? "Switch to detailed form" : "Switch to quick entry"}
                </span>
              </div>

              {isQuickEntry ? (
                <div>
                  <Label htmlFor="quickDetails">Quick Details</Label>
                  <Input
                    id="quickDetails"
                    value={formData.quickDetails}
                    onChange={(e) => setFormData((prev) => ({ ...prev, quickDetails: e.target.value }))}
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
                      <Label className="text-sm text-gray-600">Previous Services (Reference)</Label>
                      <div className="text-sm text-gray-700">{formData.previousServices}</div>
                      {formData.previousPrice && (
                        <div className="text-sm text-gray-700">Previous Price: ${formData.previousPrice}</div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customerName">Customer Name</Label>
                      <Input
                        id="customerName"
                        value={formData.customerName}
                        onChange={(e) => setFormData((prev) => ({ ...prev, customerName: e.target.value }))}
                        placeholder="Optional"
                      />
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, todaysServices: e.target.value }))}
                    placeholder="Today's services"
                  />
                </div>
                <div>
                  <Label htmlFor="todaysPrice">Today's Price</Label>
                  <Input
                    id="todaysPrice"
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
                  <Label htmlFor="customerNote">Customer Note</Label>
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
