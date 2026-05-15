"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Save } from "lucide-react"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { toast } from "sonner"
import { IconSpinner } from "@/components/ui/icon-spinner"
export default function GeneralSettingsPage() {
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(false)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  
  // Store Info
  const [storeName, setStoreName] = useState("Celtic Tiles")
  const [storeEmail, setStoreEmail] = useState("admin@celtictiles.ie")
  const [storePhone, setStorePhone] = useState("+353 14090558")
  const [storeAddress, setStoreAddress] = useState("Besides AXA insurance, Finches Industrial Park, Long Mile Rd, Walkinstown, Dublin, D12 FP74")
  
  // Currency & Pricing
  const [currencySymbol, setCurrencySymbol] = useState("€")
  const [taxRate, setTaxRate] = useState(23)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(100)
  
  // Notifications
  const [emailOnNewOrders, setEmailOnNewOrders] = useState(true)
  const [lowStockAlerts, setLowStockAlerts] = useState(true)
  const [customerReviews, setCustomerReviews] = useState(true)

  useEffect(() => {
    fetchSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchSettings = async () => {
    setIsLoadingSettings(true)
    try {
      const { data, error } = await (supabase as any)
        .from('site_settings')
        .select('*')
        .single()

      if (error && error.code !== 'PGRST116') throw error
      
      if (data) {
        setStoreName(data.store_name || "Celtic Tiles")
        setStoreEmail(data.store_email || "admin@celtictiles.ie")
        setStorePhone(data.store_phone || "+353 14090558")
        setStoreAddress(data.store_address || "")
        setCurrencySymbol(data.currency_symbol || "€")
        setTaxRate(data.tax_rate || 23)
        setFreeShippingThreshold(data.free_shipping_threshold || 100)
        setEmailOnNewOrders(data.email_on_new_orders ?? true)
        setLowStockAlerts(data.low_stock_alerts ?? true)
        setCustomerReviews(data.customer_reviews_notifications ?? true)
      }
    } catch (err: any) {
      console.error('Error fetching settings:', err)
    } finally {
      setIsLoadingSettings(false)
    }
  }

  const saveStoreInfo = async () => {
    setLoading(true)
    try {
      const { error } = await (supabase as any)
        .from('site_settings')
        .upsert({
          id: 1,
          store_name: storeName,
          store_email: storeEmail,
          store_phone: storePhone,
          store_address: storeAddress,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
      toast.success('Store information saved')
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const saveCurrencySettings = async () => {
    setLoading(true)
    try {
      const { error } = await (supabase as any)
        .from('site_settings')
        .upsert({
          id: 1,
          currency_symbol: currencySymbol,
          tax_rate: taxRate,
          free_shipping_threshold: freeShippingThreshold,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
      toast.success('Currency settings saved')
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const saveNotifications = async () => {
    setLoading(true)
    try {
      const { error } = await (supabase as any)
        .from('site_settings')
        .upsert({
          id: 1,
          email_on_new_orders: emailOnNewOrders,
          low_stock_alerts: lowStockAlerts,
          customer_reviews_notifications: customerReviews,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
      toast.success('Notification settings saved')
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {isLoadingSettings ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <IconSpinner label="Loading settings..." />
        </div>
      ) : (
        <>
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary">General Settings</h1>
            <p className="text-muted-foreground mt-1">Configure store settings and preferences</p>
          </div>

          {/* Store Information */}
          <Card>
            <CardHeader>
              <CardTitle>Store Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Store Name</label>
                <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Store Email</label>
                <Input type="email" value={storeEmail} onChange={(e) => setStoreEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone Number</label>
                <Input type="tel" value={storePhone} onChange={(e) => setStorePhone(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Address</label>
                <Input value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} />
              </div>
              <Button onClick={saveStoreInfo} disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          {/* Currency Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Currency & Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Currency Symbol</label>
                <Input value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tax Rate (%)</label>
                <Input type="number" value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Free Shipping Threshold (€)</label>
                <Input type="number" value={freeShippingThreshold} onChange={(e) => setFreeShippingThreshold(parseFloat(e.target.value))} />
              </div>
              <Button onClick={saveCurrencySettings} disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email on New Orders</p>
                  <p className="text-sm text-muted-foreground">Get notified when new orders are placed</p>
                </div>
                <div 
                  onClick={() => setEmailOnNewOrders(!emailOnNewOrders)}
                  className={`
                    w-4 h-4 flex items-center justify-center cursor-pointer
                    transition-all duration-200
                    ${emailOnNewOrders 
                      ? 'bg-primary shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.1)]' 
                      : 'bg-[#E5E9F0] shadow-[2px_2px_4px_rgba(0,0,0,0.1),-2px_-2px_4px_rgba(255,255,255,0.9)]'
                    }
                    hover:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.15),inset_-1px_-1px_3px_rgba(255,255,255,0.8)]
                  `}
                >
                  {emailOnNewOrders && (
                    <svg 
                      className="w-2.5 h-2.5 text-white" 
                      fill="none" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="3" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Low Stock Alerts</p>
                  <p className="text-sm text-muted-foreground">Receive alerts when products are running low</p>
                </div>
                <div 
                  onClick={() => setLowStockAlerts(!lowStockAlerts)}
                  className={`
                    w-4 h-4 flex items-center justify-center cursor-pointer
                    transition-all duration-200
                    ${lowStockAlerts 
                      ? 'bg-primary shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.1)]' 
                      : 'bg-[#E5E9F0] shadow-[2px_2px_4px_rgba(0,0,0,0.1),-2px_-2px_4px_rgba(255,255,255,0.9)]'
                    }
                    hover:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.15),inset_-1px_-1px_3px_rgba(255,255,255,0.8)]
                  `}
                >
                  {lowStockAlerts && (
                    <svg 
                      className="w-2.5 h-2.5 text-white" 
                      fill="none" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="3" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Customer Reviews</p>
                  <p className="text-sm text-muted-foreground">Get notified of new reviews</p>
                </div>
                <div 
                  onClick={() => setCustomerReviews(!customerReviews)}
                  className={`
                    w-4 h-4 flex items-center justify-center cursor-pointer
                    transition-all duration-200
                    ${customerReviews 
                      ? 'bg-primary shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.1)]' 
                      : 'bg-[#E5E9F0] shadow-[2px_2px_4px_rgba(0,0,0,0.1),-2px_-2px_4px_rgba(255,255,255,0.9)]'
                    }
                    hover:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.15),inset_-1px_-1px_3px_rgba(255,255,255,0.8)]
                  `}
                >
                  {customerReviews && (
                    <svg 
                      className="w-2.5 h-2.5 text-white" 
                      fill="none" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="3" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  )}
                </div>
              </div>
              <Button onClick={saveNotifications} disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
