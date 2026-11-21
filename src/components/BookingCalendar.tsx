import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { formatTime12h } from '../lib/bookingRules';

interface BookingSlot {
  date: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface BlockSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  reason: string;
}

export function BookingCalendar({
  hallId,
  selectedDate,
  onSelectDate,
}: {
  hallId: string;
  selectedDate: string;
  onSelectDate?: (dateStr: string) => void;
}) {
  const initialMonth = selectedDate ? selectedDate.slice(0, 7) : new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(initialMonth);
  const [bookings, setBookings] = useState<BookingSlot[]>([]);
  const [blocks, setBlocks] = useState<BlockSlot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiFetch<{ bookings: BookingSlot[]; blocks: BlockSlot[] }>(
      `/api/halls/${hallId}/availability?month=${month}`
    )
      .then((res) => {
        if (!active) return;
        setBookings(res.bookings || []);
        setBlocks(res.blocks || []);
      })
      .catch(() => {
        // leave empty on error
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hallId, month]);

  const [yearNum, monthNum] = month.split('-').map(Number);
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
  const firstWeekday = new Date(yearNum, monthNum - 1, 1).getDay();
  const todayStr = new Date().toISOString().slice(0, 10);

  const shiftMonth = (delta: number) => {
    const d = new Date(yearNum, monthNum - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const monthLabel = new Date(yearNum, monthNum - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const getDayState = (dateStr: string) => {
    const dayBlocks = blocks.filter((b) => b.date === dateStr);
    if (dayBlocks.length > 0) {
      return { type: 'MAINTENANCE' as const, items: dayBlocks };
    }
    const dayBookings = bookings.filter((b) => b.date === dateStr);
    if (dayBookings.some((b) => b.status === 'CONFIRMED' || b.status === 'APPROVED')) {
      return { type: 'BOOKED' as const, items: dayBookings };
    }
    if (dayBookings.some((b) => b.status === 'PENDING')) {
      return { type: 'PENDING' as const, items: dayBookings };
    }
    return { type: 'AVAILABLE' as const, items: [] };
  };

  const selectedState = selectedDate ? getDayState(selectedDate) : null;

  return (
    <div className="bg-[#18100C] border border-white/14 rounded-sm p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h4 className="font-display text-base sm:text-lg text-[#FFFFFF]">{monthLabel}</h4>
          <p className="text-[11px] text-[#B9AA99]">Select a date to view time slots</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className="p-2 border border-white/15 rounded-sm text-[#F6EBD8] hover:border-[#D6B65B] cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className="p-2 border border-white/15 rounded-sm text-[#F6EBD8] hover:border-[#D6B65B] cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend (Color + Explicit Text) */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[#B9AA99] mb-4 pb-3 border-b border-white/10">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500/80" aria-hidden="true" />
          <span>Available</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-rose-500/80" aria-hidden="true" />
          <span>Booked</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-amber-400/85" aria-hidden="true" />
          <span>Pending</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-stone-500/80" aria-hidden="true" />
          <span>Maintenance</span>
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] uppercase tracking-wider text-[#B9AA99] mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className={`grid grid-cols-7 gap-1.5 ${loading ? 'opacity-60' : ''}`}>
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const day = idx + 1;
          const dateStr = `${month}-${String(day).padStart(2, '0')}`;
          const isPast = dateStr < todayStr;
          const isSelected = selectedDate === dateStr;
          const state = getDayState(dateStr);

          let styleCls = 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200 hover:border-emerald-400';
          if (isPast) {
            styleCls = 'bg-[#120C09] border-white/5 text-[#B9AA99]/35 cursor-not-allowed';
          } else if (state.type === 'MAINTENANCE') {
            styleCls = 'bg-stone-800/70 border-stone-500/40 text-stone-300';
          } else if (state.type === 'BOOKED') {
            styleCls = 'bg-rose-950/60 border-rose-500/45 text-rose-200';
          } else if (state.type === 'PENDING') {
            styleCls = 'bg-amber-950/55 border-amber-400/45 text-amber-200';
          }

          return (
            <button
              key={dateStr}
              type="button"
              disabled={isPast}
              onClick={() => onSelectDate?.(dateStr)}
              aria-label={`${dateStr}: ${isPast ? 'Past date' : state.type}`}
              className={`h-9 rounded-sm border text-xs font-mono-num transition-all cursor-pointer ${styleCls} ${
                isSelected ? 'ring-2 ring-[#D6B65B] bg-[#D6B65B]/20 text-[#FFFFFF]' : ''
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Selected Date Details */}
      {selectedDate && selectedState && (
        <div className="mt-4 pt-3 border-t border-white/10 text-xs">
          <div className="flex items-center justify-between text-[#F6EBD8] mb-1.5">
            <span className="font-mono-num">{selectedDate}</span>
            <span className="text-[#E8CB72] uppercase tracking-wider text-[10px]">
              {selectedState.type}
            </span>
          </div>
          {selectedState.items.length === 0 ? (
            <p className="text-[#B9AA99]">Full day open for morning, afternoon, or evening slots.</p>
          ) : (
            <ul className="space-y-1 text-[#B9AA99]">
              {selectedState.items.map((item: any, idx) => (
                <li key={idx} className="font-mono-num">
                  • {formatTime12h(item.start_time)} – {formatTime12h(item.end_time)} ({item.status}
                  {item.reason ? `: ${item.reason}` : ''})
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
