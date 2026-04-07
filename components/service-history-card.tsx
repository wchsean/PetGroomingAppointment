'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { History } from 'lucide-react'
import { format } from 'date-fns'

type Service = {
  id: number | string
  dog_name: string
  service?: string
  service_date: string | Date
  service_note?: string
  service_price?: number
  type?: 'service' | 'no_show'
}

type Props = {
  serviceHistory?: Service[]
}

export default function ServiceHistoryCard({ serviceHistory }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5" />
          Service History
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {serviceHistory?.length ? (
            serviceHistory.map((service) => (
              <div key={service.id} className="p-3 border rounded-lg">
                <div className="grid grid-cols-4 gap-2 items-start">
                  {/* Dog Name */}
                  <div className="col-span-3 font-medium break-words">
                    {service.dog_name}
                  </div>

                  {/* Service / No Show */}
                  <div className="col-span-3 font-medium break-words">
                    {service.type === 'no_show' ? (
                      <span className="text-red-500">❌ No Show</span>
                    ) : (
                      service.service
                    )}
                  </div>

                  {/* Date */}
                  <div className="text-sm text-gray-500 text-right">
                    {format(new Date(service.service_date), 'MMM d, yyyy')}
                  </div>
                </div>

                <div className="flex justify-between items-center mt-2">
                  {/* Note */}
                  <div className="text-sm text-gray-600">
                    {service.service_note}
                  </div>

                  {/* Price */}
                  <div className="font-medium text-green-600">
                    {service.type === 'no_show'
                      ? ''
                      : service.service_price != null
                        ? `$${service.service_price}`
                        : ''}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-400 text-center py-4">
              No history available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}