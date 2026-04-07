'use client'

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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dog,
  Edit2,
  Save,
  X,
  Calendar,
  History,
  Plus,
  AlertTriangle,
  Trash2,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { deleteDog } from '@/lib/api-client'
import { format } from 'date-fns'

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
  dog_weight?: number | null
  note: string
  appearance: string
  active: boolean
  behaviorProfile: string[] // ✅ 直接是陣列
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

export function DogDetailDialog({
  isOpen,
  onClose,
  dogId,
  onUpdate,
}: DogDetailDialogProps) {
  interface EditDogData {
    name: string
    breed: string
    note: string
    appearance: string
    dog_weight: number | null
    behavioralIssues: string[]
    active: boolean
  }
  const [dog, setDog] = useState<DogData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isDogDetailDialogOpen, setIsDogDetailDialogOpen] = useState(false)
  const [editData, setEditData] = useState<EditDogData>({
    name: '',
    breed: '',
    note: '',
    appearance: '',
    dog_weight: null,
    behavioralIssues: [],
    active: false,
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
          breed: dogData.dog_breed || '',
          dog_weight: dogData.dog_weight || null,
          note: dogData.dog_note || '',
          appearance: dogData.dog_appearance || '',
          active: dogData.dog_active,
          behaviorProfile: dogData.behavior_profile || [], // ✅ 直接是陣列
          customerName: dogData.customer_name || '',
          serviceHistory: (dogData.service_history || []).map(
            (service: any) => ({
              id: service.id.toString(),
              date: service.service_date,
              service: service.service,
              price: service.service_price?.toString() || '',
              note: service.service_note || '',
            }),
          ),
          upcomingAppointments: (dogData.upcoming_appointments || []).map(
            (apt: any) => ({
              id: apt.id.toString(),
              date: apt.appointment_date,
              time: apt.appointment_time,
              services: apt.today_services || '',
              status: apt.appointment_status,
            }),
          ),
        }

        setDog(formattedDog)
        setEditData({
          name: formattedDog.name,
          breed: formattedDog.breed,
          note: formattedDog.note,
          dog_weight: formattedDog.dog_weight ?? null,
          appearance: formattedDog.appearance,
          behavioralIssues: Array.isArray(dogData.behavior_profile)
            ? dogData.behavior_profile
            : [], // ✅ 確保是陣列
          active: formattedDog.active,
        })
      }
    } catch (error) {
      console.error('Error fetching dog details:', error)
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
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dog_name: editData.name,
          dog_breed: editData.breed,
          dog_note: editData.note,
          dog_weight: editData.dog_weight ?? null,
          dog_appearance: editData.appearance,
          dog_active: editData.active,
          behavior_profile: editData.behavioralIssues, // ✅ 直接傳陣列
        }),
      })

      if (response.ok) {
        setIsEditing(false)
        fetchDogDetails()
        onUpdate()
      }
    } catch (error) {
      console.error('Error updating dog:', error)
    }
  }

  const handleToggleActive = async () => {
    if (!dog) return

    try {
      const updatedDog = { ...dog, active: !dog.active }

      const response = await fetch(`/api/customer-management/dogs/${dog.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dog_name: updatedDog.name,
          dog_breed: updatedDog.breed,
          dog_note: updatedDog.note,
          dog_appearance: updatedDog.appearance,
          dog_active: updatedDog.active,
          behavior_profile: updatedDog.behaviorProfile, // ✅ 直接傳陣列
        }),
      })

      if (response.ok) {
        setDog(updatedDog)
        onUpdate()
      }
    } catch (error) {
      console.error('Error toggling active:', error)
    }
  }

  const handleDeleteDog = async (dogId: string) => {
    if (!dogId) return

    try {
      const response = await deleteDog(dogId)
      if (response.ok) {
        setIsDogDetailDialogOpen(false)
        onClose()
        onUpdate()
      }
    } catch (error) {
      console.error('Error deleting dog:', error)
    }
  }

  if (!dog) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl">
          <div className="flex justify-center items-center h-32">
            {isLoading ? 'Loading...' : 'Pet not found'}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Dog Information</CardTitle>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <div className="flex items-center gap-1">
                        <Badge
                          variant={editData.active ? 'default' : 'secondary'}
                        >
                          {editData.active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setEditData((prev) => ({
                              ...prev,
                              active: !prev.active,
                            }))
                          }
                        >
                          {editData.active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>

                      <Button size="sm" onClick={handleSaveDog}>
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                      >
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

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditing(true)}
                      >
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
                        onChange={(e) =>
                          setEditData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="breed">Breed</Label>
                      <Input
                        id="breed"
                        value={editData.breed}
                        onChange={(e) =>
                          setEditData((prev) => ({
                            ...prev,
                            breed: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="weight">Weight (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        value={editData.dog_weight ?? ''}
                        onChange={(e) =>
                          setEditData((prev) => ({
                            ...prev,
                            dog_weight: parseFloat(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="appearance">Dog Appearance</Label>
                      <Input
                        id="appearance"
                        value={editData.appearance}
                        onChange={(e) =>
                          setEditData((prev) => ({
                            ...prev,
                            appearance: e.target.value,
                          }))
                        }
                        placeholder="e.g., Golden retriever with brown and white spots, long fur"
                      />
                    </div>

                    {/* Behavioral Issues */}
                    <div>
                      <Label className="text-xs">Behavioral Issues</Label>

                      {editData.behavioralIssues?.map((issue, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <Input
                            value={issue}
                            onChange={(e) => {
                              const updated = [...editData.behavioralIssues]
                              updated[index] = e.target.value
                              setEditData((prev) => ({
                                ...prev,
                                behavioralIssues: updated,
                              }))
                            }}
                            className="text-sm"
                          />

                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              const updated = editData.behavioralIssues.filter(
                                (_, i) => i !== index,
                              )
                              setEditData((prev) => ({
                                ...prev,
                                behavioralIssues: updated,
                              }))
                            }}
                          >
                            ✕
                          </Button>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setEditData((prev) => ({
                            ...prev,
                            behavioralIssues: [...prev.behavioralIssues, ''],
                          }))
                        }
                      >
                        + Add Issue
                      </Button>
                    </div>

                    <div>
                      <Label htmlFor="note">Notes</Label>
                      <Textarea
                        id="note"
                        value={editData.note}
                        onChange={(e) =>
                          setEditData((prev) => ({
                            ...prev,
                            note: e.target.value,
                          }))
                        }
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
                        <p className="text-sm text-gray-700">
                          {dog.breed || 'Not specified'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">
                          Weight (kg)
                        </Label>
                        <p className="text-sm text-gray-700">
                          {dog.dog_weight != null
                            ? Number(dog.dog_weight).toFixed(2)
                            : 'Not specified'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Status</Label>
                        <Badge variant={dog.active ? 'default' : 'secondary'}>
                          {dog.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      {dog.appearance && (
                        <div>
                          <Label className="text-sm font-medium">
                            Appearance
                          </Label>
                          <p className="text-sm text-gray-700">
                            {dog.appearance}
                          </p>
                        </div>
                      )}

                      {dog.behaviorProfile?.length > 0 && (
                        <div className="mt-2 p-2 rounded bg-red-50 border border-red-200">
                          <div className="font-medium text-red-700 mb-1">
                            Behavioral Issues:
                          </div>

                          <div className="space-y-1 text-sm text-red-800">
                            {dog.behaviorProfile.map((issue, index) => (
                              <div
                                key={index}
                                className="px-2 py-1 rounded bg-red-100"
                              >
                                {issue}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
                      <p className="text-2xl font-bold">
                        {dog.serviceHistory.length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">
                        Upcoming Appointments
                      </p>
                      <p className="text-2xl font-bold">
                        {dog.upcomingAppointments.length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 其他 Tabs 保持不變 */}
          {/* Service History & Appointments */}
          {/* ... */}
        </Tabs>

        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={isDogDetailDialogOpen}
          onOpenChange={setIsDogDetailDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Delete dog
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this dog? This action cannot be
                undone.
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
