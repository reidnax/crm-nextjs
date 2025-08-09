"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CalendarIcon, MapPinIcon, TrendingUp, Users } from "lucide-react";
import { format } from "date-fns";
import { formatInIST } from "@/lib/timezone-utils";
import { DailyReportCreateSchema } from "@/lib/validations/daily-report";
import type { DailyReportCreate } from "@/lib/validations/daily-report";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface DailyReportFormProps {
  defaultValues: DailyReportCreate;
}

interface Zone {
  value: string;
  label: string;
}

export default function DailyReportForm({
  defaultValues,
}: DailyReportFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [isZoneOpen, setIsZoneOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    city: string;
  } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [zoneSearchValue, setZoneSearchValue] = useState("");

  const form = useForm<DailyReportCreate>({
    resolver: zodResolver(DailyReportCreateSchema),
    defaultValues,
  });

  // Load zones from API
  useEffect(() => {
    async function loadZones() {
      try {
        const response = await fetch("/api/meta/zones");
        if (response.ok) {
          const data = await response.json();
          const zoneOptions = data.data.zones.map((zone: string) => ({
            value: zone,
            label: zone,
          }));
          setZones(zoneOptions);
        }
      } catch (error) {
        console.error("Failed to load zones:", error);
      }
    }
    loadZones();
  }, []);

  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser");
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({
          latitude,
          longitude,
          city: "", // User can enter manually
        });

        // Update form values
        form.setValue("geoLat", latitude);
        form.setValue("geoLon", longitude);

        setIsGettingLocation(false);
        toast.success("Location captured successfully");
      },
      (error) => {
        setIsGettingLocation(false);
        let message = "Failed to get location";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            message =
              "Location access denied. Please enable location permissions.";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            message = "Location request timed out.";
            break;
        }

        toast.error(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  };

  const onSubmit = async (data: DailyReportCreate) => {
    setIsSubmitting(true);

    try {
      // Include location data if available
      const submitData = {
        ...data,
        reportDate: data.reportDate.toISOString(),
        ...(location && {
          geoCity: location.city || data.geoCity,
          geoLat: location.latitude,
          geoLon: location.longitude,
        }),
      };

      const response = await fetch("/api/reports/daily", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to submit report");
      }

      // Success handling
      const isLate = result.data.isLateSubmission;
      const reportDate = formatInIST(
        new Date(result.data.reportDate),
        "yyyy-MM-dd"
      );

      if (isLate) {
        toast.success(
          `Daily report submitted successfully! Note: This was marked as a late submission.`,
          { duration: 6000 }
        );
      } else {
        toast.success("Daily report submitted successfully!");
      }

      // Navigate to report view or clear form
      router.push(`/reports/daily?date=${reportDate}`);
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to submit report"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleZoneSelect = (zoneValue: string) => {
    form.setValue("zone", zoneValue);
    setIsZoneOpen(false);
  };

  const addNewZone = (newZone: string) => {
    if (newZone.trim()) {
      const trimmedZone = newZone.trim();
      // Add to local zones list if not already present
      if (!zones.some((z) => z.value === trimmedZone)) {
        setZones((prev) => [
          ...prev,
          { value: trimmedZone, label: trimmedZone },
        ]);
      }
      form.setValue("zone", trimmedZone);
      setZoneSearchValue("");
      setIsZoneOpen(false);
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-6 sm:space-y-8"
    >
      {/* Report Date and Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-3">
          <Label
            htmlFor="reportDate"
            className="text-sm font-medium text-gray-700"
          >
            Report Date
          </Label>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                id="reportDate"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-12 bg-white border-gray-300 hover:bg-gray-50",
                  !form.watch("reportDate") && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {form.watch("reportDate")
                  ? format(form.watch("reportDate"), "PPP")
                  : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 max-h-[300px] overflow-y-auto"
              align="start"
              side="bottom"
              sideOffset={4}
            >
              <Calendar
                mode="single"
                selected={form.watch("reportDate")}
                onSelect={(date) => {
                  if (date) {
                    // Create date at noon in local timezone to avoid timezone shifting
                    // when converting to ISO string for API submission
                    const noonDate = new Date(
                      date.getFullYear(),
                      date.getMonth(),
                      date.getDate(),
                      12,
                      0,
                      0,
                      0
                    );
                    form.setValue("reportDate", noonDate);
                    setIsCalendarOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {form.formState.errors.reportDate && (
            <p className="text-sm text-red-600">
              {form.formState.errors.reportDate.message}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Label htmlFor="zone" className="text-sm font-medium text-gray-700">
            Zone/State
          </Label>
          <Popover open={isZoneOpen} onOpenChange={setIsZoneOpen}>
            <PopoverTrigger asChild>
              <Button
                id="zone"
                variant="outline"
                role="combobox"
                aria-expanded={isZoneOpen}
                className="w-full justify-between h-12 bg-white border-gray-300 hover:bg-gray-50"
              >
                {form.watch("zone") || "Select or type zone..."}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[300px] p-0 max-h-[300px] overflow-y-auto"
              align="start"
              side="bottom"
              sideOffset={4}
            >
              <Command>
                <CommandInput
                  placeholder="Search or type new zone..."
                  value={zoneSearchValue}
                  onValueChange={setZoneSearchValue}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (zoneSearchValue.trim()) {
                        addNewZone(zoneSearchValue.trim());
                        setZoneSearchValue("");
                      }
                    }
                  }}
                />
                <CommandEmpty>
                  {zoneSearchValue.trim() && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => {
                        if (zoneSearchValue.trim()) {
                          addNewZone(zoneSearchValue.trim());
                          setZoneSearchValue("");
                        }
                      }}
                    >
                      Create &quot;{zoneSearchValue.trim()}&quot;
                    </Button>
                  )}
                  {!zoneSearchValue.trim() && (
                    <div className="py-2 text-center text-sm text-muted-foreground">
                      Type to create a new zone
                    </div>
                  )}
                </CommandEmpty>
                <CommandGroup>
                  {zones.map((zone) => (
                    <CommandItem
                      key={zone.value}
                      value={zone.value}
                      onSelect={() => handleZoneSelect(zone.value)}
                    >
                      {zone.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
          {form.formState.errors.zone && (
            <p className="text-sm text-red-600">
              {form.formState.errors.zone.message}
            </p>
          )}
        </div>
      </div>

      <Separator className="my-6" />

      {/* Sales and Collections */}
      <Card className="shadow-sm border-gray-200 bg-white/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Sales & Collections
          </CardTitle>
          <CardDescription>Record today's sales performance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-3">
              <Label
                htmlFor="salesUnitsToday"
                className="text-sm font-medium text-gray-700"
              >
                Sales Units Today
              </Label>
              <Input
                id="salesUnitsToday"
                type="number"
                min="0"
                step="1"
                className="h-12 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                {...form.register("salesUnitsToday", { valueAsNumber: true })}
                placeholder="0"
              />
              {form.formState.errors.salesUnitsToday && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.salesUnitsToday.message}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Label
                htmlFor="collectionsTodayINR"
                className="text-sm font-medium text-gray-700"
              >
                Collections Today (₹)
              </Label>
              <Input
                id="collectionsTodayINR"
                type="number"
                min="0"
                step="0.01"
                className="h-12 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                {...form.register("collectionsTodayINR", {
                  valueAsNumber: true,
                })}
                placeholder="0.00"
              />
              {form.formState.errors.collectionsTodayINR && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.collectionsTodayINR.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visits and Meetings */}
      <Card className="shadow-sm border-gray-200 bg-white/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-blue-600" />
            Visits & Meetings
          </CardTitle>
          <CardDescription>Record your field activities today</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="space-y-3">
              <Label
                htmlFor="dealerMeetingsCount"
                className="text-sm font-medium text-gray-700"
              >
                Dealer Meetings
              </Label>
              <Input
                id="dealerMeetingsCount"
                type="number"
                min="0"
                step="1"
                className="h-12 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                {...form.register("dealerMeetingsCount", {
                  valueAsNumber: true,
                })}
                placeholder="0"
              />
              {form.formState.errors.dealerMeetingsCount && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.dealerMeetingsCount.message}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Label
                htmlFor="plantVisitsCount"
                className="text-sm font-medium text-gray-700"
              >
                Plant Visits
              </Label>
              <Input
                id="plantVisitsCount"
                type="number"
                min="0"
                step="1"
                className="h-12 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                {...form.register("plantVisitsCount", { valueAsNumber: true })}
                placeholder="0"
              />
              {form.formState.errors.plantVisitsCount && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.plantVisitsCount.message}
                </p>
              )}
            </div>

            <div className="space-y-3 sm:col-span-2 lg:col-span-1">
              <Label
                htmlFor="newDealershipVisitsCount"
                className="text-sm font-medium text-gray-700"
              >
                New Dealership Visits
              </Label>
              <Input
                id="newDealershipVisitsCount"
                type="number"
                min="0"
                step="1"
                className="h-12 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                {...form.register("newDealershipVisitsCount", {
                  valueAsNumber: true,
                })}
                placeholder="0"
              />
              {form.formState.errors.newDealershipVisitsCount && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.newDealershipVisitsCount.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes and Location */}
      <Card className="shadow-sm border-gray-200 bg-white/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPinIcon className="h-5 w-5 text-purple-600" />
            Additional Information
          </CardTitle>
          <CardDescription>Optional notes and location data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label
              htmlFor="notes"
              className="text-sm font-medium text-gray-700"
            >
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              className="min-h-[100px] bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
              {...form.register("notes")}
              placeholder="Any additional notes or comments about today's activities..."
              rows={4}
            />
            {form.formState.errors.notes && (
              <p className="text-sm text-red-600">
                {form.formState.errors.notes.message}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <Label className="text-sm font-medium text-gray-700">
                Location Information
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={getCurrentLocation}
                disabled={isGettingLocation}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <MapPinIcon className="h-4 w-4" />
                {isGettingLocation ? "Getting Location..." : "Capture Location"}
              </Button>
            </div>

            {location && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-medium">
                  📍 Location captured: {location.latitude.toFixed(6)},{" "}
                  {location.longitude.toFixed(6)}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Label
                htmlFor="geoCity"
                className="text-sm font-medium text-gray-700"
              >
                City (Optional)
              </Label>
              <Input
                id="geoCity"
                className="h-12 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                {...form.register("geoCity")}
                placeholder="Enter city name"
                value={location?.city || form.watch("geoCity") || ""}
                onChange={(e) => {
                  form.setValue("geoCity", e.target.value);
                  if (location) {
                    setLocation({ ...location, city: e.target.value });
                  }
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? "Submitting..." : "Submit Report"}
        </Button>
      </div>
    </form>
  );
}
