"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dog, Edit2, Save, X, Calendar, History, Plus, AlertTriangle, Trash2 } from "lucide-react"
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
import { deleteDog } from "@/lib/api-client"
import { format } from "date-fns"

interface DogDetailDialogProps {
  isOpen: boolean
  onClose: () => void
  dogId: string | null
  onUpdate: () => void
}

interface DogData {
  id: string
  name: string
  breed: string
  note: string
  active: boolean
  customerName: string
  serviceHistory: {
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

export function DogDetailDialog({ isOpen, onClose, dogId, onUpdate }: DogDetailDialogProps) {
  const [dog, setDog] = useState<DogData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isDogDetailDialogOpen, setIsDogDetailDialogOpen] = useState(false)
  const [editData, setEditData] = useState({
    name: "",
    breed: "",
    note: "",
  })

  const fetchDogDetails = async () => {
    if (!dogId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/customer-management/dogs/${dogId}`)
      const result = await response.json()

      if (result.success) {
        const dogData = result.data
        const formattedDog: DogData = {
          id: dogData.id.toString(),
          name: dogData.dog_name,
          breed: dogData.dog_breed || "",
          note: dogData.dog_note || "",
          active: dogData.dog_active,
          customerName: dogData.customer_name || "",
          serviceHistory: (dogData.service_history || []).map((service: any) => ({
            id: service.id.toString(),
            date: service.service_date,
            service: service.service,
            price: service.service_price?.toString() || "",
            note: service.service_note || "",
          })),
          upcomingAppointments: (dogData.upcoming_appointments || []).map((apt: any) => ({
            id: apt.id.toString(),
            date: apt.appointment_date,
            time: apt.appointment_time,
            services: apt.today_services || "",
            status: apt.appointment_status,
          })),
        }

        setDog(formattedDog)
        setEditData({
          name: formattedDog.name,
          breed: formattedDog.breed,
          note: formattedDog.note,
        })
      }
    } catch (error) {
      console.error("Error fetching dog details:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && dogId) {
      fetchDogDetails()
    }
  }, [isOpen, dogId])

  const handleSaveDog = async () => {
    if (!dogId) return

    try {
      const response = await fetch(`/api/customer-management/dogs/${dogId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dog_name: editData.name,
          dog_breed: editData.breed,
          dog_note: editData.note,
        }),
      })

      if (response.ok) {
        setIsEditing(false)
        fetchDogDetails()
        onUpdate()
      }
    } catch (error) {
      console.error("Error updating dog:", error)
    }
  }

  const handleDeleteDog = async (dogId:string) => {
    if (!dogId) return

    try {
      const response = await deleteDog(dogId)

      if (response.ok) {
        setIsDogDetailDialogOpen(false)
        onClose()
        onUpdate()
      }
    } catch (error) {
      console.error("Error deleting dog:", error)
    }
  }

  if (!dog) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl">
          <div className="flex justify-center items-center h-32">{isLoading ? "Loading..." : "Pet not found"}</div>
        </DialogContent>
      </Dialog>
    )
  }
  console.log("Dog details:", dog)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dog className="h-5 w-5" />
            Pet Details - {dog.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Pet Details</TabsTrigger>
            <TabsTrigger value="history">Service History</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            {/* Pet Basic Info */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Dog Information</CardTitle>
                <div className="flex gap-2">

                  {isEditing ? (
                    <>
                      <Button size="sm" onClick={handleSaveDog}>
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>  
                      <Button
                        size="sm"
                        variant="outline"
                        className="hover:shadow-md"
                        onClick={(e) => {
                          e.stopPropagation()
                          setIsDogDetailDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>

                      <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div>
                      <Label htmlFor="name">Pet Name</Label>
                      <Input
                        id="name"
                        value={editData.name}
                        onChange={(e) => setEditData((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="breed">Breed</Label>
                      <Input
                        id="breed"
                        value={editData.breed}
                        onChange={(e) => setEditData((prev) => ({ ...prev, breed: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="note">Notes</Label>
                      <Textarea
                        id="note"
                        value={editData.note}
                        onChange={(e) => setEditData((prev) => ({ ...prev, note: e.target.value }))}
                        rows={3}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Pet Name</Label>
                        <p className="text-lg">{dog.name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Owner</Label>
                        <p className="text-lg">{dog.customerName}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Breed</Label>
                        <p className="text-sm text-gray-700">{dog.breed || "Not specified"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Status</Label>
                        <Badge variant={dog.active ? "default" : "secondary"}>
                          {dog.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                    {dog.note && (
                      <div>
                        <Label className="text-sm font-medium">Notes</Label>
                        <p className="text-sm text-gray-700">{dog.note}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Total Services</p>
                      <p className="text-2xl font-bold">{dog.serviceHistory.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Upcoming Appointments</p>
                      <p className="text-2xl font-bold">{dog.upcomingAppointments.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Service History</h3>
              {/* <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Service Record
              </Button> */}
            </div>

            <div className="space-y-3">
              {dog.serviceHistory.length > 0 ? (
                dog.serviceHistory.map((service) => (
                  <Card key={service.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-lg">{service.service}</div>
                          {service.note && <div className="text-sm text-gray-600 mt-1">{service.note}</div>}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">{format(new Date(service.date), "MMM d, yyyy")}</div>
                          {service.price && <div className="font-medium text-green-600 text-lg">${service.price}</div>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">No service history yet</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="appointments" className="space-y-4">
            <h3 className="text-lg font-semibold">Upcoming Appointments</h3>

            <div className="space-y-3">
              {dog.upcomingAppointments.length > 0 ? (
                dog.upcomingAppointments.map((appointment) => (
                  <Card key={appointment.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-lg">
                            {format(new Date(appointment.date), "MMM d, yyyy")} at {appointment.time}
                          </div>
                          {appointment.services && (
                            <div className="text-sm text-gray-600 mt-1">Services: {appointment.services}</div>
                          )}
                        </div>
                        <Badge variant="outline">{appointment.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">No upcoming appointments</div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDogDetailDialogOpen} onOpenChange={setIsDogDetailDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Delete dog
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this dog? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDeleteDog(dogId)}
                className="bg-red-500 hover:bg-red-600"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>


      </DialogContent>
    </Dialog>
  )
}
