import { jsPDF } from 'jspdf';
import type { Booking, PaymentRecord } from '../types';
import { formatCurrency, formatTime12h } from './bookingRules';

export function downloadBookingReceiptPdf(booking: Booking, payment?: PaymentRecord | null) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  // Header Espresso Banner
  doc.setFillColor(16, 11, 8);
  doc.rect(0, 0, pageW, 118, 'F');

  doc.setTextColor(214, 182, 91);
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.text('VOWS & VENUES', 48, 54);

  doc.setTextColor(246, 235, 216);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('OFFICIAL RESERVATION & PAYMENT RECEIPT', 48, 76);
  doc.text(`Ref: ${booking.booking_ref}`, pageW - 48, 54, { align: 'right' });
  doc.text(`Issued: ${new Date().toLocaleDateString('en-IN')}`, pageW - 48, 76, { align: 'right' });

  // Gold Divider
  doc.setDrawColor(214, 182, 91);
  doc.setLineWidth(1.2);
  doc.line(48, 134, pageW - 48, 134);

  let y = 166;
  doc.setTextColor(24, 18, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Event & Venue Summary', 48, y);

  y += 22;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  const details: Array<[string, string]> = [
    ['Venue', booking.hall_name ?? 'Community Venue'],
    ['Location', booking.hall_location ?? 'Heritage District'],
    ['Guest / Host', `${booking.user_name ?? 'Member'} (${booking.user_email ?? ''})`],
    ['Event Title', booking.event_name],
    ['Event Category', booking.event_type],
    ['Event Date', booking.event_date],
    ['Time Window', `${formatTime12h(booking.start_time)} – ${formatTime12h(booking.end_time)}`],
    ['Expected Guests', `${booking.guest_count} guests`],
    ['Reservation Status', booking.booking_status],
    ['Payment Status', booking.payment_status],
  ];

  for (const [label, value] of details) {
    doc.setTextColor(100, 90, 82);
    doc.text(label, 48, y);
    doc.setTextColor(20, 14, 10);
    doc.text(String(value), 200, y);
    y += 20;
  }

  y += 14;
  doc.setDrawColor(220, 210, 198);
  doc.line(48, y, pageW - 48, y);
  y += 26;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(24, 18, 14);
  doc.text('Financial Breakdown', 48, y);
  y += 22;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  const financials: Array<[string, string]> = [
    ['Venue Rental Charge', formatCurrency(booking.base_amount)],
    ['Celebration Package', formatCurrency(booking.package_amount)],
    ['Taxes & Service Levy', formatCurrency(booking.tax_amount)],
    ['Refundable Security Deposit', formatCurrency(booking.deposit_amount)],
    ['Total Reservation Value', formatCurrency(booking.total_amount)],
    ['Total Paid to Date', formatCurrency(booking.paid_amount)],
    ['Remaining Balance', formatCurrency(Math.max(0, booking.total_amount - booking.paid_amount))],
  ];

  for (const [label, val] of financials) {
    const isTotal = label === 'Total Reservation Value' || label === 'Total Paid to Date';
    doc.setFont('helvetica', isTotal ? 'bold' : 'normal');
    doc.setTextColor(isTotal ? 16 : 90, isTotal ? 11 : 80, isTotal ? 8 : 72);
    doc.text(label, 48, y);
    doc.text(val, pageW - 48, y, { align: 'right' });
    y += 20;
  }

  if (payment) {
    y += 14;
    doc.setDrawColor(220, 210, 198);
    doc.line(48, y, pageW - 48, y);
    y += 26;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Verified Transaction Details', 48, y);
    y += 20;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(80, 72, 65);
    doc.text(`Gateway: ${payment.gateway} (${payment.method})`, 48, y);
    y += 18;
    doc.text(`Order ID: ${payment.razorpay_order_id}`, 48, y);
    y += 18;
    doc.text(`Payment ID: ${payment.razorpay_payment_id ?? 'Pending'}`, 48, y);
    y += 18;
    doc.text(`Transaction Amount: ${formatCurrency(payment.amount)} (${payment.status})`, 48, y);
  }

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(125, 112, 98);
  doc.text(
    'Vows & Venues · Every Celebration Deserves a Beautiful Space · concierge@vowsandvenues.com',
    pageW / 2,
    doc.internal.pageSize.getHeight() - 40,
    { align: 'center' }
  );

  doc.save(`VowsAndVenues_Receipt_${booking.booking_ref}.pdf`);
}
