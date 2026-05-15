// Utility functions for generating order IDs and numbers

let orderCounter = 6 // Start from 6 since we have 5 mock orders

export function generateOrderId(): string {
  return `ORD-${String(orderCounter++).padStart(3, '0')}`
}

export function generateOrderNumber(): string {
  const year = new Date().getFullYear()
  return `CT-${year}-${String(orderCounter).padStart(3, '0')}`
}

export function calculateOrderTotals(items: { unitPrice: number; quantity: number }[]): {
  subtotal: number
  tax: number
  total: number
} {
  const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
  const tax = subtotal * 0.18 // 18% GST
  return {
    subtotal,
    tax,
    total: subtotal + tax
  }
}

export function getValidNextStatuses(currentStatus: string): string[] {
  const statusProgression: Record<string, string[]> = {
    'Pending': ['Confirmed', 'Cancelled'],
    'Confirmed': ['Processing', 'Cancelled'],
    'Processing': ['Ready', 'Cancelled'],
    'Ready': ['Shipped', 'Cancelled'],
    'Shipped': ['Delivered'],
    'Delivered': [],
    'Cancelled': []
  }
  return statusProgression[currentStatus] || []
}

export function formatOrderDate(date: string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function getStatusColor(status: string): {
  bg: string
  text: string
  border: string
} {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    'Pending': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
    'Confirmed': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
    'Processing': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    'Ready': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
    'Shipped': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
    'Delivered': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
    'Cancelled': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' }
  }
  return colors[status] || colors['Pending']
}
