import React from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Phone, Clock } from 'lucide-react'

// Fix Leaflet marker icon issue
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
})
L.Marker.prototype.options.icon = DefaultIcon

interface Branch {
    _id: string
    name: string
    address: string
    phone: string
    latitude: number
    longitude: number
    workingHours: string
}

interface BranchMapProps {
    branches: Branch[]
}

export default function BranchMap({ branches }: BranchMapProps) {
    // Center of Uzbekistan (Tashkent)
    const center: [number, number] = [41.3111, 69.2406]

    return (
        <div className="w-full h-[450px] rounded-3xl overflow-hidden shadow-soft border border-gray-100 z-0">
            <MapContainer
                center={center}
                zoom={12}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {branches.map((b) => (
                    <Marker key={b._id} position={[b.latitude, b.longitude]}>
                        <Popup className="branch-popup">
                            <div className="p-1">
                                <h3 className="font-bold text-gray-900 text-base mb-1">{b.name}</h3>
                                <p className="text-gray-500 text-xs mb-3 flex items-start gap-1">
                                    <MapPin className="w-3 h-3 mt-0.5 text-primary-600 flex-shrink-0" />
                                    {b.address}
                                </p>
                                <div className="space-y-1.5 border-t border-gray-100 pt-2 mt-2">
                                    <p className="text-[11px] text-gray-600 flex items-center gap-1.5">
                                        <Phone className="w-3 h-3 text-gray-400" />
                                        {b.phone}
                                    </p>
                                    <p className="text-[11px] text-gray-600 flex items-center gap-1.5">
                                        <Clock className="w-3 h-3 text-gray-400" />
                                        {b.workingHours}
                                    </p>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    )
}
