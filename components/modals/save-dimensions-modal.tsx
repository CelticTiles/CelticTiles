"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface SaveDimensionsModalProps {
    isOpen: boolean
    onClose: () => void
}

export function SaveDimensionsModal({ isOpen, onClose }: SaveDimensionsModalProps) {
    const [roomName, setRoomName] = useState("")
    const [measurement, setMeasurement] = useState("total-space")
    const [area, setArea] = useState("")
    const [width, setWidth] = useState("")
    const [length, setLength] = useState("")
    const [unit, setUnit] = useState("m")

    if (!isOpen) return null

    const handleSave = () => {
        // TODO: Implement save functionality
        const calculatedArea = measurement === "width-length" 
            ? (parseFloat(width) || 0) * (parseFloat(length) || 0)
            : parseFloat(area) || 0
        
        onClose()
    }

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 p-8">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X className="h-6 w-6" />
                </button>

                {/* Header */}
                <h2 className="text-2xl font-bold uppercase tracking-wide mb-2">
                    SAVE YOUR DIMENSIONS
                </h2>
                <p className="text-sm text-gray-600 mb-6">
                    Enter the dimensions for your rooms and see your own pricing throughout the website.
                </p>

                {/* Form */}
                <div className="space-y-5">
                    {/* Room Name */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Name your room
                        </label>
                        <input
                            type="text"
                            placeholder="E.g. Kitchen"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tm-red focus:border-transparent"
                        />
                    </div>

                    {/* Measurement Type */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Measurement
                        </label>
                        <select
                            value={measurement}
                            onChange={(e) => setMeasurement(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tm-red focus:border-transparent appearance-none bg-white"
                        >
                            <option value="total-space">Total Space</option>
                            <option value="width-length">Width x Length</option>
                        </select>
                    </div>

                    {/* Conditional Input Fields */}
                    {measurement === "total-space" ? (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Area
                            </label>
                            <div className="flex gap-3">
                                <input
                                    type="number"
                                    placeholder="E.g. 16"
                                    value={area}
                                    onChange={(e) => setArea(e.target.value)}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tm-red focus:border-transparent"
                                />
                                <select
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value)}
                                    className="w-20 px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tm-red focus:border-transparent appearance-none bg-white"
                                >
                                    <option value="m">m</option>
                                    <option value="ft">ft</option>
                                </select>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Width
                                </label>
                                <div className="flex gap-3">
                                    <input
                                        type="number"
                                        placeholder="E.g. 4"
                                        value={width}
                                        onChange={(e) => setWidth(e.target.value)}
                                        className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tm-red focus:border-transparent"
                                    />
                                    <select
                                        value={unit}
                                        onChange={(e) => setUnit(e.target.value)}
                                        className="w-20 px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tm-red focus:border-transparent appearance-none bg-white"
                                    >
                                        <option value="m">m</option>
                                        <option value="ft">ft</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Length
                                </label>
                                <div className="flex gap-3">
                                    <input
                                        type="number"
                                        placeholder="E.g. 4"
                                        value={length}
                                        onChange={(e) => setLength(e.target.value)}
                                        className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tm-red focus:border-transparent"
                                    />
                                    <select
                                        value={unit}
                                        onChange={(e) => setUnit(e.target.value)}
                                        className="w-20 px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tm-red focus:border-transparent appearance-none bg-white"
                                    >
                                        <option value="m">m</option>
                                        <option value="ft">ft</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Save Button */}
                    <Button
                        onClick={handleSave}
                        variant="default"
                        size="lg"
                        className="w-full font-semibold uppercase tracking-wide"
                    >
                        Save & Update Prices
                    </Button>
                </div>
            </div>
        </div>
    )
}
