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
import { User, Phone, Dog, Edit2, Plus, Trash2, Save, X, Calendar, Star } from "lucide-react"
import { format } from "date-fns"
import { PhoneManagementDialog } from "./phone-management-dialog"
import { DogDetailDialog } from "./dog-detail-dialog"
import {createDog} from "@/lib/api-client"
import type { CustomerDetail } from "@/types/customer-management"

interface CustomerDetailDialogProps {
  isOpen: boolean
  onClose: () => void
  customerId: string | null
  onUpdate: () => void
}

interface Phone {
  id: string;
  phone_owner: string | null;
  phone: string;
  phone_type: string | null;
  is_primary: boolean;
}

export function CustomerDetailDialog({ isOpen, onClose, customerId, onUpdate }: CustomerDetailDialogProps) {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({ name: "", note: "" })
  const [isPhoneDialogOpen, setIsPhoneDialogOpen] = useState(false)
  const [isDogCreateDialogOpen, setIsDogCreateDialogOpen] = useState(false)
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null)
  const [selectedPhoneData, setSelectedPhoneData] = useState<string | null>(null)

  const fetchCustomerDetails = async () => {
    if (!customerId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/customer-management/customers/${customerId}`)
      const result = await response.json()

      if (result.success) {
        const customerData = result.data
        const formattedCustomer: CustomerDetail = {
          id: customerData.id.toString(),
          name: customerData.customer_name || "Unnamed Customer",
          note: customerData.customer_note || "",
          active: customerData.customer_active,
          phones: (customerData.phones || []).map((phone: any) => ({
            id: phone.id.toString(),
            owner: phone.phone_owner || "",
            phone: phone.phone,
            type: phone.phone_type || "",
            isPrimary: phone.is_primary,
          })),
          dogs: (customerData.dogs || []).map((dog: any) => ({
            id: dog.id.toString(),
            name: dog.dog_name,
            breed: dog.dog_breed || "",
            note: dog.dog_note || "",
            active: dog.dog_active,
            recentServices: (dog.recent_services || []).map((service: any) => ({
              id: service.id.toString(),
              date: service.service_date,
              service: service.service,
              price: service.service_price?.toString() || "",
              note: service.service_note || "",
            })),
            upcomingAppointments: (dog.upcoming_appointments || []).map((apt: any) => ({
              id: apt.id.toString(),
              date: apt.appointment_date,
              time: apt.appointment_time,
              services: apt.today_services || "",
              status: apt.appointment_status,
            })),
          })),
          totalDogs: customerData.dogs?.length || 0,
          activeDogs: customerData.dogs?.filter((dog: any) => dog.dog_active).length || 0,
        }

        setCustomer(formattedCustomer)
        setEditData({
          name: formattedCustomer.name,
          note: formattedCustomer.note,
        })
      }
    } catch (error) {
      console.error("Error fetching customer details:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && customerId) {
      fetchCustomerDetails()
    }
  }, [isOpen, customerId])

  const handleSaveCustomer = async () => {
    if (!customerId) return

    try {
      const response = await fetch(`/api/customer-management/customers/${customerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: editData.name,
          customer_note: editData.note,
        }),
      })

      if (response.ok) {
        setIsEditing(false)
        fetchCustomerDetails()
        onUpdate()
      }
    } catch (error) {
      console.error("Error updating customer:", error)
    }
  }

  const handleUpdatePhone = (phoneDate: Phone | null = null) => {
    console.log("Updating phone with ID:", phoneDate)
    setSelectedPhoneData(phoneDate);
    setIsPhoneDialogOpen(true)
  }

  const handleDeletePhone = async (phoneId: string) => {
    try {
      const response = await fetch(`/api/customer-management/phones/${phoneId}`, {
        method: "DELETE",
      })

      console.log("Delete phone response:", response)
      if (response.ok) {
        fetchCustomerDetails()
        onUpdate()
      }
    } catch (error) {
      console.error("Error deleting phone:", error)
    }
  }

  const handleDogCreate = async (e: React.FormEvent) => {
    try {
      e.preventDefault()
      const createdDogData = {
        dog_name: editData.dogName,
        dog_note: editData.dogNote,
        dog_breed: editData.breed,
        customerId: customer.id,
      }

      const response = await createDog(createdDogData)
      console.log("response:", response)

      if (response.ok) {
        fetchCustomerDetails()
        onUpdate()
      }

      
  } catch (error) {
      console.error("Error creating dog:", error)
      // Handle error (e.g., show notification)
    }
    finally {
      setIsDogCreateDialogOpen(false)
    }
  }

  if (!customer) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl">
          <div className="flex justify-center items-center h-32">{isLoading ? "Loading..." : "Customer not found"}</div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Details
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="phones">Phone Management</TabsTrigger>
            <TabsTrigger value="dogs">Pet Management</TabsTrigger>
            <TabsTrigger value="history">Service History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Customer Basic Info */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Basic Information</CardTitle>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button size="sm" onClick={handleSaveCustomer}>
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div>
                      <Label htmlFor="name">Customer Name</Label>
                      <Input
                        id="name"
                        value={editData.name}
                        onChange={(e) => setEditData((prev) => ({ ...prev, name: e.target.value }))}
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
                    <div>
                      <Label className="text-sm font-medium">Customer Name</Label>
                      <p className="text-lg">{customer.name}</p>
                    </div>
                    {customer.note && (
                      <div>
                        <Label className="text-sm font-medium">Notes</Label>
                        <p className="text-sm text-gray-700">{customer.note}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Phone Numbers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {customer.phones.length === 0 ? (
                  <p className="text-sm text-gray-500">No phone numbers available</p>
                ) : (
                  customer.phones.map((phone) => (
                    <div key={phone.id} className="flex items-center justify-between p-2 border rounded-lg">
                      <div>
                        <div className="font-medium">{phone.phone}</div>
                        {phone.owner && <div className="text-sm text-gray-600">Owner: {phone.owner}</div>}
                        {phone.type && <div className="text-sm text-gray-600">Type: {phone.type}</div>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleUpdatePhone(phone)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeletePhone(phone.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
                <Button size="sm" variant="outline" onClick={() => setIsPhoneDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Phone
                </Button>
              </CardContent>
            </Card>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Phone Numbers</p>
                      <p className="text-2xl font-bold">{customer.phones.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Dog className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Pets</p>
                      <p className="text-2xl font-bold">
                        {customer.activeDogs}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-600">Upcoming Appointments</p>
                      <p className="text-2xl font-bold">
                        {customer.dogs.reduce((sum, dog) => sum + dog.upcomingAppointments.length, 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pet Quick Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Pet Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customer.dogs.map((dog) => (
                    <div
                      key={dog.id}
                      className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedDogId(dog.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{dog.name}</h4>
                        <Badge variant={dog.active ? "default" : "secondary"}>
                          {dog.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {dog.breed && <p className="text-sm text-gray-600 mb-2">Breed: {dog.breed}</p>}
                      <div className="text-xs text-gray-500">
                        <div>Recent services: {dog.recentServices.length}</div>
                        <div>Upcoming appointments: {dog.upcomingAppointments.length}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="phones" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Phone Management</h3>
              <Button onClick={() => setIsPhoneDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Phone
              </Button>
            </div>

            <div className="space-y-3">
              {customer.phones.map((phone) => (
                <Card key={phone.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{phone.phone}</span>
                          {phone.isPrimary && (
                            <Badge variant="default" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Primary
                            </Badge>
                          )}
                        </div>
                        {phone.owner && <p className="text-sm text-gray-600">Contact: {phone.owner}</p>}
                        {phone.type && <p className="text-sm text-gray-600">Type: {phone.type}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeletePhone(phone.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="dogs" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Pet Management</h3>
              <Button onClick={() => setIsDogCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Pet
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customer.dogs.map((dog) => (
                <Card key={dog.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4" onClick={() => setSelectedDogId(dog.id)}>
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium text-lg">{dog.name}</h4>
                      <Badge variant={dog.active ? "default" : "secondary"}>{dog.active ? "Active" : "Inactive"}</Badge>
                    </div>

                    {dog.breed && <p className="text-sm text-gray-600 mb-2">Breed: {dog.breed}</p>}

                    {dog.note && <p className="text-sm text-gray-600 mb-3">{dog.note}</p>}

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Recent services:</span>
                        <span className="font-medium">{dog.recentServices.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Upcoming appointments:</span>
                        <span className="font-medium">{dog.upcomingAppointments.length}</span>
                      </div>
                    </div>

                    {dog.recentServices.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-gray-500 mb-1">Latest service:</p>
                        <div className="text-sm">
                          <div className="font-medium">{dog.recentServices[0].service}</div>
                          <div className="text-gray-600">
                            {format(new Date(dog.recentServices[0].date), "yyyy/MM/dd")}
                            {dog.recentServices[0].price && ` - $${dog.recentServices[0].price}`}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <h3 className="text-lg font-semibold">Service History</h3>

            <div className="space-y-6">
              {customer.dogs.map((dog) => (
                <Card key={dog.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{dog.name}'s Service Records</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dog.recentServices.length > 0 ? (
                      <div className="space-y-3">
                        {dog.recentServices.map((service) => (
                          <div key={service.id} className="flex justify-between items-start p-3 border rounded">
                            <div className="flex-1">
                              <div className="font-medium">{service.service}</div>
                              {service.note && <div className="text-sm text-gray-600 mt-1">{service.note}</div>}
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-500">
                                {format(new Date(service.date), "yyyy/MM/dd")}
                              </div>
                              {service.price && <div className="font-medium text-green-600">${service.price}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-4">No service records yet</div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>

        {/* Sub-dialogs */}
        <PhoneManagementDialog
          isOpen={isPhoneDialogOpen}
          onClose={() => {setIsPhoneDialogOpen(false);setSelectedPhoneData(null);}}
          customerId={customer.id}
          phoneData={selectedPhoneData ? selectedPhoneData : null}
          onSuccess={() => {
            fetchCustomerDetails()
            onUpdate()
            setIsPhoneDialogOpen(false)
          }}
        />

        <DogDetailDialog
          isOpen={!!selectedDogId}
          onClose={() => setSelectedDogId(null)}
          dogId={selectedDogId}
          onUpdate={() => {
            fetchCustomerDetails()
            onUpdate()
          }}
        />

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
                    onChange={(e) => setEditData((prev) => ({ ...prev, dogName: e.target.value }))} 
                    placeholder="Dog Name" />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="breed">Breed</Label>
                  <Input
                    id="breed"
                    onChange={(e) => setEditData((prev) => ({ ...prev, breed: e.target.value }))}
                    placeholder="breed"
                  />
                </div>
                <div>
                  <Label className="text-xs">Dog's Note</Label>
                  <Textarea
                    onChange={(e) => setEditData((prev) => ({ ...prev, dogNote: e.target.value }))}
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
        
      </DialogContent>
    </Dialog>
  )
}
