import type { ServiceListing, Capability } from "../core/types.js";
import { ServiceListingSchema } from "../core/types.js";
import { newId } from "../core/ids.js";
import { child } from "../core/logger.js";

const log = child("marketplace");

export class Marketplace {
  private listings = new Map<string, ServiceListing>();

  list(input: {
    provider_id: string;
    capability: ServiceListing["capability"];
    price_wei: string;
    pricing_unit: ServiceListing["pricing_unit"];
    sla: ServiceListing["sla"];
    regions?: string[];
    listing_id?: string;
    active?: boolean;
  }): ServiceListing {
    const listing = ServiceListingSchema.parse({
      listing_id: input.listing_id ?? newId("list"),
      active: input.active ?? true,
      ...input,
    });
    this.listings.set(listing.listing_id, listing);
    log.info({ listing_id: listing.listing_id, cap: listing.capability, price: listing.price_wei }, "listed");
    return listing;
  }

  deactivate(listingId: string): void {
    const l = this.listings.get(listingId);
    if (l) l.active = false;
  }

  byCapability(cap: Capability): ServiceListing[] {
    return [...this.listings.values()].filter((l) => l.active && l.capability === cap);
  }

  byProvider(providerId: string): ServiceListing[] {
    return [...this.listings.values()].filter((l) => l.provider_id === providerId);
  }

  all(): ServiceListing[] {
    return [...this.listings.values()];
  }
}
