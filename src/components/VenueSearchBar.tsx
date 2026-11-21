import React from 'react';
import { Search } from 'lucide-react';
import { EVENT_TYPES } from '../types';
import { GoldButton } from './ui/LuxuryPrimitives';

export interface VenueSearchFilters {
  location: string;
  eventDate: string;
  minCapacity: string;
  eventType: string;
  maxBudget: string;
  category: string;
  sort: string;
}

export function VenueSearchBar({
  filters,
  onChange,
  onSearch,
}: {
  filters: VenueSearchFilters;
  onChange: (next: VenueSearchFilters) => void;
  onSearch: () => void;
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <section
      id="venue-discovery"
      className="relative z-20 bg-[#160F0B] border-y border-white/12 py-12 sm:py-16"
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-[11px] font-medium tracking-[0.22em] uppercase text-[#D6B65B]">
              Venue Discovery
            </span>
            <h2 className="font-display text-2xl sm:text-3xl text-[#FFFFFF] mt-2">
              Find Your Perfect Venue
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#B9AA99] max-w-md">
            Filter our curated collection by city, celebration date, guest capacity, and budget
            to preview real-time availability.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#21150F] border border-white/15 rounded-sm p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="search-location" className="text-[11px] uppercase tracking-[0.14em] text-[#B9AA99]">
              Location
            </label>
            <select
              id="search-location"
              value={filters.location}
              onChange={(e) => onChange({ ...filters, location: e.target.value })}
              className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2.5 text-sm text-[#F6EBD8] focus:border-[#D6B65B] focus:outline-none"
            >
              <option value="">All Cities</option>
              <option value="Mumbai">South Mumbai</option>
              <option value="Jaipur">Jaipur Heritage Quarter</option>
              <option value="Bengaluru">Bengaluru Indiranagar</option>
              <option value="Delhi">New Delhi</option>
              <option value="Pune">Pune Koregaon Park</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="search-date" className="text-[11px] uppercase tracking-[0.14em] text-[#B9AA99]">
              Event Date
            </label>
            <input
              id="search-date"
              type="date"
              value={filters.eventDate}
              onChange={(e) => onChange({ ...filters, eventDate: e.target.value })}
              className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2.5 text-sm text-[#F6EBD8] font-mono-num focus:border-[#D6B65B] focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="search-capacity" className="text-[11px] uppercase tracking-[0.14em] text-[#B9AA99]">
              Guest Capacity
            </label>
            <select
              id="search-capacity"
              value={filters.minCapacity}
              onChange={(e) => onChange({ ...filters, minCapacity: e.target.value })}
              className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2.5 text-sm text-[#F6EBD8] focus:border-[#D6B65B] focus:outline-none"
            >
              <option value="">Any Size</option>
              <option value="50">50+ Guests</option>
              <option value="150">150+ Guests</option>
              <option value="300">300+ Guests</option>
              <option value="500">500+ Guests</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="search-event-type" className="text-[11px] uppercase tracking-[0.14em] text-[#B9AA99]">
              Event Type
            </label>
            <select
              id="search-event-type"
              value={filters.eventType}
              onChange={(e) => onChange({ ...filters, eventType: e.target.value })}
              className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2.5 text-sm text-[#F6EBD8] focus:border-[#D6B65B] focus:outline-none"
            >
              <option value="">All Occasions</option>
              {EVENT_TYPES.map((ev) => (
                <option key={ev} value={ev}>
                  {ev}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="search-budget" className="text-[11px] uppercase tracking-[0.14em] text-[#B9AA99]">
              Budget (Max Base)
            </label>
            <select
              id="search-budget"
              value={filters.maxBudget}
              onChange={(e) => onChange({ ...filters, maxBudget: e.target.value })}
              className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3 py-2.5 text-sm text-[#F6EBD8] focus:border-[#D6B65B] focus:outline-none"
            >
              <option value="">Any Budget</option>
              <option value="75000">Up to ₹75,000</option>
              <option value="130000">Up to ₹1,30,000</option>
              <option value="180000">Up to ₹1,80,000</option>
            </select>
          </div>

          <GoldButton type="submit" size="md" className="w-full h-[42px]">
            <Search className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Explore Venues</span>
          </GoldButton>
        </form>
      </div>
    </section>
  );
}
