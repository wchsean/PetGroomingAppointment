"use client"

import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { searchCustomers } from "@/lib/api-client"
import type { CustomerData, DogData } from "@/types"

interface CustomerSearchProps {
  onSelectCustomer: (customer: CustomerData) => void
  onSelectDog: (dog: DogData & { customerName: string; customerPhone: string }) => void
}

export function CustomerSearch({ onSelectCustomer, onSelectDog }: CustomerSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [results, setResults] = useState<CustomerData[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const searchCustomersDebounced = async () => {
      if (searchTerm.length < 2) {
        setResults([])
        return
      }

      setIsLoading(true)
      try {
        const customers = await searchCustomers(searchTerm)
        setResults(customers)
      } catch (error) {
        console.error("Error searching customers:", error)
      } finally {
        setIsLoading(false)
      }
    }

    const timeoutId = setTimeout(searchCustomersDebounced, 300)
    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by customer name, dog name, or phone..."
          className="pl-10"
        />
      </div>

      {isLoading && <div className="text-sm text-gray-500">Searching...</div>}

      {results.length > 0 && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {results.map((customer) => (
            <Card
              key={customer.id}
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => onSelectCustomer(customer)}
            >
              <CardContent className="p-4">
                <div className="font-medium">{customer.name || "Unnamed Customer"}</div>
                <div className="text-sm text-gray-600">Phone: {customer.phone || "N/A"}</div>

                {customer.dogs.length > 0 && (
                  <div className="mt-2">
                    <Label className="text-xs text-gray-500">Dogs:</Label>
                    <div className="grid grid-cols-1 gap-2 mt-1">
                      {customer.dogs.map((dog) => (
                        <div
                          key={dog.id}
                          className="p-2 border rounded-md hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectDog({
                              ...dog,
                              customerName: customer.name,
                              customerPhone: customer.phone,
                            })
                          }}
                        >
                          <div className="font-medium">{dog.name}</div>
                          {dog.breed && <div className="text-xs text-gray-600">Breed: {dog.breed}</div>}
                          {dog.previousServices && (
                            <div className="text-xs text-gray-600">
                              Last service: {dog.previousServices} (${dog.previousPrice || "N/A"})
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {searchTerm.length >= 2 && results.length === 0 && !isLoading && (
        <div className="text-sm text-gray-500">No customers found. Try a different search term.</div>
      )}
    </div>
  )
}
