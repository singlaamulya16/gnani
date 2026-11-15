import { motion } from 'framer-motion';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { donorPhoto, placePhoto } from '@/lib/images';
import { SmartImage } from './SmartImage';
import { placesService } from '@/services/placesService';
import type { Place } from '@/types/domain';
import { Icon, type IconName } from './Icon';

const kindIcon: Record<Place['kind'], IconName> = {
  hospital: 'hospital',
  clinic: 'stethoscope',
  doctor: 'stethoscope',
  pharmacy: 'pill',
  blood_bank: 'droplet',
  donor: 'users',
  ambulance: 'ambulance',
  ngo: 'users',
};

interface PlaceCardProps {
  place: Place;
  selected?: boolean;
  onSelect?: () => void;
  actions?: boolean;
}

export function PlaceCard({ place, selected, onSelect, actions = true }: PlaceCardProps) {
  const { t } = useTranslation();
  const [reportSent, setReportSent] = useState(false);
  const hasPhone = Boolean(place.phone?.trim());
  const hoursLabel = place.openingHours?.trim()
    ? place.openingHours
    : place.openNow === true
      ? t('common.openNow')
      : t('places.hoursNotListed');

  return (
    <motion.div
      whileTap={{ scale: 0.985 }}
      className={cn(
        'w-full rounded-[var(--radius-xl)] border border-border bg-surface p-4 text-left shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-float)]',
        selected && 'ring-2 ring-accent shadow-[var(--shadow-float)]',
      )}
    >
      <button type="button" onClick={onSelect} className="flex w-full items-start gap-3 text-left">
        <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-accent-soft">
          <SmartImage
            src={place.kind === 'donor' ? donorPhoto(place.name.split(/[\s·]/)[0] ?? place.name) : placePhoto(place.kind)}
            alt=""
            className="h-full w-full object-cover"
            fallback={
              <span className="flex h-full w-full items-center justify-center text-primary">
                <Icon name={kindIcon[place.kind]} size={20} />
              </span>
            }
          />
          <span className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-accent shadow">
            <Icon name={kindIcon[place.kind]} size={12} />
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="font-[family-name:var(--font-sans)] text-[15px] font-semibold leading-snug text-text">
              {place.name}
            </span>
            <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-white">
              {place.distanceKm.toFixed(1)} {t('common.km')}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-[12.5px] text-text-secondary">{place.address}</span>
          <span className="mt-1 block text-[12px] text-text-secondary">{hoursLabel}</span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {place.demo || place.source === 'demo' ? (
              <span className="rounded-full bg-surface-low px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-text-secondary">
                {t('places.demo')}
              </span>
            ) : place.verified ? (
              <span className="rounded-full bg-primary-soft px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                {t('places.verified')}
              </span>
            ) : (
              <span className="rounded-full bg-surface-low px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-text-secondary">
                {t('places.unverified')}
              </span>
            )}
            {place.openNow === true && (
              <span className="rounded-full bg-primary-soft px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                {t('common.openNow')}
              </span>
            )}
            {place.etaMin != null && (
              <span className="inline-flex items-center gap-0.5 text-[11.5px] text-text-secondary">
                <Icon name="clock" size={11} />
                {place.etaMin} {t('common.min')}
              </span>
            )}
            {(place.tags ?? [])
              .filter((tag) => tag !== place.kind)
              .slice(0, 2)
              .map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-surface-low px-1.5 py-0.5 text-[11px] font-semibold text-text-secondary"
                >
                  {tag}
                </span>
              ))}
          </span>
        </span>
        <Icon name="chevronRight" size={14} className="mt-0.5 text-text-secondary" />
      </button>

      {actions && selected && (
        <div className="mt-2 space-y-1.5 border-t border-border pt-2">
          <div className="flex gap-1.5">
            {hasPhone ? (
              <a
                href={`tel:${place.phone!.replace(/\s/g, '')}`}
                className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-xs font-bold text-on-primary"
              >
                <Icon name="phone" size={14} />
                {t('common.call')}
              </a>
            ) : (
              <span className="inline-flex min-h-9 flex-1 items-center justify-center rounded-lg bg-surface-low text-[11px] font-semibold text-text-secondary">
                {t('places.phoneUnavailable')}
              </span>
            )}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-primary text-xs font-bold text-primary"
            >
              <Icon name="navigation" size={14} />
              {t('common.navigate')}
            </a>
          </div>
          {!place.demo && place.source !== 'demo' && (
            <button
              type="button"
              disabled={reportSent}
              onClick={() => {
                void placesService
                  .reportWrongInfo(place.id, 'Wrong info reported from app')
                  .then((r) => {
                    if (r.ok) setReportSent(true);
                  });
              }}
              className="w-full text-left text-[11.5px] font-semibold text-text-secondary underline-offset-2 hover:underline disabled:no-underline"
            >
              {reportSent ? t('places.reportSent') : t('places.reportWrong')}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
