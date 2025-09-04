"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Search, Plus, Users, Phone, Dog, Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CustomerDetailDialog } from "@/components/customer-management-detail-dialog"
import { CreateCustomerDialog } from "@/components/create-customer-dialog"
import type { CustomerListItem } from "@/types/customer-management"

export default function CustomerManagementPage() {
  const [customers, setCustomers] = useState<CustomerListItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total_customers: 0,
    total_dogs_across_customers: 0,
    totalPages: 0,
  })
 
  const searchParams = useSearchParams()
  const customerIdFromUrl = searchParams.get("customerId")

  const fetchCustomers = async (page = 1, search = "") => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      })

      if (search.length >= 2) {
        params.append("search", search)
      }

      const response = await fetch(`/api/customer-management/customers?${params}`)
      const result = await response.json()

      if (result.success) {
        // Transform data format
        const formattedCustomers = result.data.customers.map((customer: any) => ({
          id: customer.id.toString(),
          name: customer.customer_name || "Unnamed Customer",
          note: customer.customer_note || "",
          active: customer.customer_active,
          phones: (customer.phones || []).map((phone: any) => ({
            id: phone.id.toString(),
            owner: phone.phone_owner || "",
            phone: phone.phone,
            type: phone.phone_type || "",
            isPrimary: phone.is_primary,
          })),
          dogs: (customer.dogs || []).map((dog: any) => ({
            id: dog.id.toString(),
            name: dog.dog_name,
            breed: dog.dog_breed || "",
            active: dog.dog_active,
          })),
          totalDogs: customer.total_dogs || 0,
          activeDogs: customer.active_dogs || 0,
        }))
        console.log("Formatted customers:", formattedCustomers)
        console.log("Pagination data:", result.data.pagination)

        setCustomers(formattedCustomers)
        setPagination(result.data.pagination)
      }
    } catch (error) {
      console.error("Error fetching customers:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchCustomers(1, searchTerm)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  // Handle direct customer link from Daily Appointments
  useEffect(() => {
    if (customerIdFromUrl) {
      setSelectedCustomer(customerIdFromUrl)
    }
  }, [customerIdFromUrl])

  const handleCustomerClick = (customerId: string) => {
    console.log("Selected customer ID:", customerId)
    setSelectedCustomer(customerId)
  }

  const handleCreateCustomer = () => {
    fetchCustomers(pagination.page, searchTerm)
    setIsCreateDialogOpen(false)
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-gray-600">Manage customer information, contacts and pet details</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search customer name, phone or dog name..."
          className="pl-10"
        />
      </div>

      {/* Statistics */}
      {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold">{pagination.total_customers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Dog className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Total Pets</p>
                <p className="text-2xl font-bold">{pagination.total_dogs_across_customers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Total Phones</p>
                <p className="text-2xl font-bold">
                  {customers.reduce((sum, customer) => sum + customer.phones.length, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div> */}

      {/* Customer List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500">{searchTerm ? "No customers found" : "No customer data yet"}</div>
          </div>
        ) : (
          customers.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} onClick={() => handleCustomerClick(customer.id)} />
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={pagination.page === 1}
            onClick={() => fetchCustomers(pagination.page - 1, searchTerm)}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={pagination.page === pagination.totalPages}
            onClick={() => fetchCustomers(pagination.page + 1, searchTerm)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <CustomerDetailDialog
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        customerId={selectedCustomer}
        onUpdate={() => fetchCustomers(pagination.page, searchTerm)}
      />

      <CreateCustomerDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={handleCreateCustomer}
      />
    </div>
  )
}

interface CustomerCardProps {
  customer: CustomerListItem
  onClick: () => void
}

function CustomerCard({ customer, onClick }: CustomerCardProps) {
  const primaryPhone = customer.phones.find((phone) => phone.isPrimary) || customer.phones[0]

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold">{customer.name}</h3>
            {customer.note && <p className="text-sm text-gray-600 mt-1">{customer.note}</p>}
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700">
            Active
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Contact Information */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Phone className="h-4 w-4" />
              Contact Info
            </div>
            {primaryPhone ? (
              <div className="text-sm">
                <div className="font-medium">{primaryPhone.phone}</div>
                {primaryPhone.owner && <div className="text-gray-600">{primaryPhone.owner}</div>}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No phone data</div>
            )}
            {customer.phones.length > 1 && (
              <div className="text-xs text-gray-500">
                {customer.phones
                  .filter((phone) => phone.phone !== primaryPhone?.phone) // 過濾掉 primaryPhone
                  .map((phone, index) => (
                    <div key={index}>{phone.phone}</div>
                  ))}
              </div>
            )}
          </div>

          {/* Pet Information */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Dog className="h-4 w-4" />
              Pet Info
            </div>
            <div className="text-sm">
              <div>{customer.totalDogs} pets total</div>
              <div className="text-gray-600">Active: {customer.activeDogs}</div>
            </div>
            {customer.dogs.map((dog) => (
              <div key={dog.id} className="text-xs text-gray-600">
                {dog.name} {dog.breed && `(${dog.breed})`}
              </div>
            ))}
            {/* {customer.dogs.length > 2 && (
              <div className="text-xs text-gray-500">+{customer.dogs.length - 2} other pets</div>
            )} */}
          </div>

          {/* Quick Actions */}
          {/* <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Calendar className="h-4 w-4" />
              Quick Actions
            </div>
            <div className="space-y-1">
              <Button variant="outline" size="sm" className="w-full text-xs bg-transparent">
                New Appointment
              </Button>
              <Button variant="outline" size="sm" className="w-full text-xs bg-transparent">
                View History
              </Button>
            </div>
          </div> */}
        </div>
      </CardContent>
    </Card>
  )
}
