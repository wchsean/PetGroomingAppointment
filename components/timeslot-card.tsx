'use client'

import type React from 'react'
import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TimeSlotData, AppointmentData } from '@/types'

interface TimeSlotCardProps {
  timeSlot: TimeSlotData
  appointments: AppointmentData[]
  isEditing?: boolean
  onEdit?: () => void
  onDelete?: () => void
  onUpdate?: (slotId: number, data: Partial<TimeSlotData>) => void
  onAddAppointment?: () => void
  children?: React.ReactNode
}

export function TimeSlotCard({
  timeSlot,
  appointments,
  isEditing = false,
  onEdit,
  onDelete,
  onUpdate,
  onAddAppointment,
  children,
}: TimeSlotCardProps) {
  const bookedCount = appointments.length
  const availableCount = Math.max(0, timeSlot.capacity - bookedCount)
  const isFull = bookedCount >= timeSlot.capacity

  return (
    <Card
      className={cn(
        'overflow-hidden',
        isFull ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50',
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-mono">
              {timeSlot.slot_time}
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {timeSlot.slot_type}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className={cn(
                'text-xs',
                isFull
                  ? 'bg-red-200 text-red-800'
                  : 'bg-green-200 text-green-800',
              )}
            >
              {bookedCount}/{timeSlot.capacity}
            </Badge>
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="h-6 w-6 p-0"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-6 w-6 p-0"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {children}
        {onAddAppointment && !isFull && (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={onAddAppointment}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Appointment
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
