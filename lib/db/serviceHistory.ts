import pool from '@/lib/db'

export type Service = {
  id: number
  dog_id: number
  dog_name: string
  service: string
  service_date: string | Date
  service_note?: string
  service_price?: number
  type: 'service' | 'no_show'
}

export async function getServiceHistoryByDogIds(dogIds: number[]): Promise<Record<number, Service[]>> {
  if (!dogIds.length) return {}

  // 1. 取正常 services
  const servicesResult = await pool.query(
    `
    SELECT s.*, d.dog_name
    FROM grooming.service_history s
    JOIN grooming.dogs d ON s.dog_id = d.id
    WHERE dog_id = ANY($1)
    ORDER BY dog_id, service_date DESC
    `,
    [dogIds],
  )

  // 2. 取 no-show
  const noShowResult = await pool.query(
    `
    SELECT
      a.id,
      a.dog_id,
      a.appointment_date AS service_date,
      'NO SHOW' AS service,
      NULL AS service_price,
      'Customer did not show up' AS service_note
    FROM grooming.appointments a
    WHERE a.dog_id = ANY($1)
      AND a.appointment_status = 'x'
    ORDER BY a.dog_id, a.appointment_date DESC
    `,
    [dogIds],
  )

  // 3. 合併並標記 type
  const services: Service[] = [
    ...servicesResult.rows.map(s => ({ ...s, type: 'service' })),
    ...noShowResult.rows.map(n => ({ ...n, type: 'no_show' })),
  ]

  // 4. 排序
  services.sort((a, b) => new Date(b.service_date).getTime() - new Date(a.service_date).getTime())

  // 5. group by dog_id
  return services.reduce((acc, service) => {
    if (!acc[service.dog_id]) acc[service.dog_id] = []
    acc[service.dog_id].push(service)
    return acc
  }, {} as Record<number, Service[]>)
}