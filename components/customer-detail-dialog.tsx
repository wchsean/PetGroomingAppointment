"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, History } from "lucide-react"
import { format } from "date-fns"
import type { CustomerData, DogData } from "@/types"

interface CustomerDetailDialogProps {
  isOpen: boolean
  onClose: () => void
  customer: CustomerData | null
  selectedDog?: DogData | null
}

export function CustomerDetailDialog({ isOpen, onClose, customer, selectedDog }: CustomerDetailDialogProps) {
  if (!customer) return null

  const initialTab = selectedDog ? `dog-${selectedDog.id}` : "customer"

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Details
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={initialTab} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${1 + customer.dogs.length}, 1fr)` }}>
            <TabsTrigger value="customer">Customer</TabsTrigger>
            {customer.dogs.map((dog) => (
              <TabsTrigger key={dog.id} value={`dog-${dog.id}`}>
                {dog.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="customer" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{customer.name || "Unnamed Customer"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Phone</Label>
                    <p className="text-sm text-gray-700">{customer.phone || "Not provided"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Number of Dogs</Label>
                    <p className="text-sm text-gray-700">{customer.dogs.length}</p>
                  </div>
                </div>

                {customer.generalNote && (
                  <div>
                    <Label className="text-sm font-medium">General Notes</Label>
                    <p className="text-sm text-gray-700">{customer.generalNote}</p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium">Dogs</Label>
                  <div className="space-y-2 mt-2">
                    {customer.dogs.map((dog) => (
                      <div key={dog.id} className="p-2 border rounded-lg">
                        <div className="font-medium">{dog.name}</div>
                        {dog.breed && <div className="text-sm text-gray-600">Breed: {dog.breed}</div>}
                        {dog.previousServices && (
                          <div className="text-sm text-gray-600">
                            Last service: {dog.previousServices} (${dog.previousPrice || "N/A"})
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {customer.dogs.map((dog) => (
            <TabsContent key={dog.id} value={`dog-${dog.id}`} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{dog.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Breed</Label>
                      <p className="text-sm text-gray-700">{dog.breed || "Not specified"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Latest Service</Label>
                      <p className="text-sm text-gray-700">{dog.previousServices || "No services yet"}</p>
                    </div>
                  </div>

                  {dog.note && (
                    <div>
                      <Label className="text-sm font-medium">Dog Notes</Label>
                      <p className="text-sm text-gray-700">{dog.note}</p>
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
                    {dog.serviceHistory && dog.serviceHistory.length > 0 ? (
                      dog.serviceHistory.map((service) => (
                        <div key={service.id} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-medium">{service.services}</div>
                            <div className="text-sm text-gray-500">{format(new Date(service.date), "MMM d, yyyy")}</div>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="text-sm text-gray-600">{service.note || "No notes"}</div>
                            <div className="font-medium text-green-600">${service.price || "N/A"}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500">No service history available</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
