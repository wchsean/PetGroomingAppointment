"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, UserPlus } from "lucide-react"

interface CreateCustomerDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface PhoneData {
  phone_owner: string
  phone: string
  phone_type: string
  is_primary: boolean
}

interface DogData {
  dog_name: string
  dog_breed: string
  dog_note: string
}

export function CreateCustomerDialog({ isOpen, onClose, onSuccess }: CreateCustomerDialogProps) {
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_note: "",
  })
  const [phones, setPhones] = useState<PhoneData[]>([
    { phone_owner: "", phone: "", phone_type: "mobile", is_primary: true },
  ])
  const [dogs, setDogs] = useState<DogData[]>([{ dog_name: "", dog_breed: "", dog_note: "" }])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      // Validate at least one dog name
      const validDogs = dogs.filter((dog) => dog.dog_name.trim())
      if (validDogs.length === 0) {
        setError("At least one pet name is required")
        setIsLoading(false)
        return
      }

      const response = await fetch("/api/customer-management/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: formData.customer_name,
          customer_note: formData.customer_note,
          phones: phones.filter((phone) => phone.phone.trim()),
          dogs: validDogs,
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Reset form
        setFormData({ customer_name: "", customer_note: "" })
        setPhones([{ phone_owner: "", phone: "", phone_type: "mobile", is_primary: true }])
        setDogs([{ dog_name: "", dog_breed: "", dog_note: "" }])
        onSuccess()
      } else {
        setError(result.error || "Failed to create customer")
      }
    } catch (error) {
      console.error("Error creating customer:", error)
      setError("Failed to create customer")
    } finally {
      setIsLoading(false)
    }
  }

  const addPhone = () => {
    setPhones([...phones, { phone_owner: "", phone: "", phone_type: "mobile", is_primary: false }])
  }

  const removePhone = (index: number) => {
    if (phones.length > 1) {
      setPhones(phones.filter((_, i) => i !== index))
    }
  }

  const updatePhone = (index: number, field: keyof PhoneData, value: string | boolean) => {
    const newPhones = [...phones]
    newPhones[index] = { ...newPhones[index], [field]: value }

    // If setting as primary, unset others
    if (field === "is_primary" && value) {
      newPhones.forEach((phone, i) => {
        if (i !== index) phone.is_primary = false
      })
    }

    setPhones(newPhones)
  }

  const addDog = () => {
    setDogs([...dogs, { dog_name: "", dog_breed: "", dog_note: "" }])
  }

  const removeDog = (index: number) => {
    if (dogs.length > 1) {
      setDogs(dogs.filter((_, i) => i !== index))
    }
  }

  const updateDog = (index: number, field: keyof DogData, value: string) => {
    const newDogs = [...dogs]
    newDogs[index] = { ...newDogs[index], [field]: value }
    setDogs(newDogs)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New Customer
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customer_name">Customer Name</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, customer_name: e.target.value }))}
                  placeholder="Customer name"
                />
              </div>
              <div>
                <Label htmlFor="customer_note">Notes</Label>
                <Textarea
                  id="customer_note"
                  value={formData.customer_note}
                  onChange={(e) => setFormData((prev) => ({ ...prev, customer_note: e.target.value }))}
                  placeholder="General notes about the customer"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Phone Numbers */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Phone Numbers</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addPhone}>
                <Plus className="h-4 w-4 mr-2" />
                Add Phone
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {phones.map((phone, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Phone Number</Label>
                      <Input
                        value={phone.phone}
                        onChange={(e) => updatePhone(index, "phone", e.target.value)}
                        placeholder="Phone number"
                      />
                    </div>
                    <div>
                      <Label>Contact Person</Label>
                      <Input
                        value={phone.phone_owner}
                        onChange={(e) => updatePhone(index, "phone_owner", e.target.value)}
                        placeholder="Who answers"
                      />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <select
                        value={phone.phone_type}
                        onChange={(e) => updatePhone(index, "phone_type", e.target.value)}
                        className="w-full p-2 border rounded"
                      >
                        <option value="mobile">Mobile</option>
                        <option value="home">Home</option>
                        <option value="work">Work</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="flex items-end gap-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={phone.is_primary}
                          onChange={(e) => updatePhone(index, "is_primary", e.target.checked)}
                        />
                        <span className="text-sm">Primary</span>
                      </label>
                      {phones.length > 1 && (
                        <Button type="button" variant="outline" size="sm" onClick={() => removePhone(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Pets */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Pets *</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addDog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Pet
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {dogs.map((dog, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Pet Name *</Label>
                      <Input
                        value={dog.dog_name}
                        onChange={(e) => updateDog(index, "dog_name", e.target.value)}
                        placeholder="Pet name (required)"
                        required={index === 0}
                      />
                    </div>
                    <div>
                      <Label>Breed</Label>
                      <Input
                        value={dog.dog_breed}
                        onChange={(e) => updateDog(index, "dog_breed", e.target.value)}
                        placeholder="Pet breed"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      {dogs.length > 1 && (
                        <Button type="button" variant="outline" size="sm" onClick={() => removeDog(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label>Notes</Label>
                    <Textarea
                      value={dog.dog_note}
                      onChange={(e) => updateDog(index, "dog_note", e.target.value)}
                      placeholder="Notes about this pet"
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {error && <div className="text-sm text-red-500 p-3 bg-red-50 border border-red-200 rounded">{error}</div>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Customer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
