"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Phone } from "lucide-react"

interface PhoneManagementDialogProps {
  isOpen: boolean
  onClose: () => void
  customerId: string
  phoneData?: {
    phone_owner: string | null
    phone: string
    phone_type: string | null
    is_primary: boolean
    } | null // For editing existing phone
  onSuccess: () => void
}

export function PhoneManagementDialog({
  isOpen,
  onClose,
  customerId,
  phoneData = null,
  onSuccess,
}: PhoneManagementDialogProps) {
  const [formData, setFormData] = useState({
    phone_owner: "",
    phone: "",
    phone_type: "",
    is_primary: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const phoneId = phoneData ? phoneData.id : null

  useEffect(() => {
    if (isOpen) {
      if (phoneId) {
        console.log("Editing phone with ID:", phoneId)
        // Load existing phone data for editing
        // This would fetch the phone data from API
        // For now, we'll just reset the form
        setFormData({
          phone_owner: phoneData?.phone_owner || "",
          phone: phoneData?.phone || "",
          phone_type: phoneData?.phone_type || "",
          is_primary: phoneData?.is_primary || false,
        })
      } else {
        // Reset form for new phone
        setFormData({
          phone_owner: "",
          phone: "",
          phone_type: "",
          is_primary: false,
        })
      }
      setError("")
    }
  }, [isOpen, phoneId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const url = phoneId ? `/api/customer-management/phones/${phoneId}` : "/api/customer-management/phones"

      const method = phoneId ? "PUT" : "POST"

      const body = {
        customer_id: customerId,
        ...formData,
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (result.success) {
        onSuccess()
      } else {
        setError(result.error || "Failed to save phone")
      }
    } catch (error) {
      console.error("Error saving phone:", error)
      setError("Failed to save phone")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            {phoneId ? "Edit Phone" : "Add Phone"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="Phone number"
              required
            />
          </div>

          <div>
            <Label htmlFor="phone_owner">Contact Person</Label>
            <Input
              id="phone_owner"
              value={formData.phone_owner}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone_owner: e.target.value }))}
              placeholder="Who answers this phone"
            />
          </div>

          <div>
            <Label htmlFor="phone_type">Phone Type</Label>
            <Select
              value={formData.phone_type}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, phone_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select phone type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mobile">Mobile</SelectItem>
                <SelectItem value="home">Home</SelectItem>
                <SelectItem value="work">Work</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_primary"
              checked={formData.is_primary}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_primary: checked as boolean }))}
            />
            <Label htmlFor="is_primary">Set as primary phone</Label>
          </div>

          {error && <div className="text-sm text-red-500">{error}</div>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : phoneId ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
