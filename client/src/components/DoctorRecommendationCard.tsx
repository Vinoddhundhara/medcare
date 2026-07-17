import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Stethoscope, CheckCircle, Star, Building2, Award, MapPin, IndianRupee } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AIDoctorResult } from "@/context/AIAssistantContext";

interface DoctorRecommendationCardProps {
  conditions: string[];
  specialist: string;
  doctors: AIDoctorResult[];
  selectedDoctor: AIDoctorResult | null;
  onSelectDoctor: (doctor: AIDoctorResult) => void;
}

export function DoctorRecommendationCard({
  conditions,
  specialist,
  doctors,
  selectedDoctor,
  onSelectDoctor,
}: DoctorRecommendationCardProps) {
  // Generate stable mock rating and distance for each doctor based on their ID
  const doctorsWithMockDetails = useMemo(() => {
    return doctors.map((doc) => {
      // Create stable pseudo-random rating from ID (e.g. 4.5 - 4.9)
      const seed = doc.id * 13;
      const rating = (4.5 + (seed % 5) * 0.1).toFixed(1);
      // Create stable pseudo-random distance (e.g. 0.8 - 4.5 km)
      const distance = (0.8 + (seed % 37) * 0.1).toFixed(1);
      return {
        ...doc,
        rating,
        distance,
      };
    });
  }, [doctors]);

  return (
    <div className="space-y-4 w-full">
      {/* Card 2 & 3: Conditions and Specialist */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="grid md:grid-cols-2 gap-3"
      >
        <Card className="border-border/60 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md shadow-sm">
          <CardContent className="p-4 space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              ⚠️ Possible Conditions
            </h4>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {conditions.length > 0 ? (
                conditions.map((cond, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 font-medium px-2 py-0.5"
                  >
                    {cond}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground italic">
                  Analysis in progress...
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md shadow-sm">
          <CardContent className="p-4 space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              👨‍⚕️ Recommended Specialist
            </h4>
            <div className="pt-1 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  {specialist || "General Physician"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Highly matches your clinical profile
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Card 4: Nearby Doctors list */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="space-y-2"
      >
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
          📍 Matched Doctors Nearby
        </h4>

        {doctorsWithMockDetails.length > 0 ? (
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
            {doctorsWithMockDetails.map((doc, idx) => {
              const isSelected = selectedDoctor?.id === doc.id;
              const initials = doc.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2);

              return (
                <div
                  key={doc.id}
                  onClick={() => onSelectDoctor(doc)}
                  className={cn(
                    "p-3 rounded-xl border transition-all duration-300 cursor-pointer flex items-center justify-between gap-3 group relative overflow-hidden bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md",
                    isSelected
                      ? "border-primary/80 ring-2 ring-primary/20 shadow-md bg-blue-50/20 dark:bg-blue-900/10"
                      : "border-border/60 hover:border-primary/40 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/80 hover:shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Doctor Avatar */}
                    <div
                      className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center text-xs font-bold transition-transform duration-300 group-hover:scale-105 shrink-0",
                        isSelected
                          ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-border"
                      )}
                    >
                      {initials}
                    </div>

                    <div className="space-y-0.5">
                      <h5 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors flex items-center gap-1.5">
                        Dr. {doc.name}
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        )}
                      </h5>

                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-0.5 text-zinc-700 dark:text-zinc-300 font-medium">
                          <Building2 className="w-3 h-3 text-blue-500" /> {doc.hospital}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Award className="w-3 h-3 text-amber-500" /> {doc.experience} yrs
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5 text-zinc-700 dark:text-zinc-300">
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> {doc.rating}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                    {/* Distance & Fee */}
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/15">
                      <IndianRupee className="w-2.5 h-2.5" /> {doc.consultationFee}
                    </span>
                    <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                      <MapPin className="w-2.5 h-2.5 text-zinc-400" /> {doc.distance} km away
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed border-2 bg-transparent">
            <CardContent className="py-6 text-center text-xs text-muted-foreground">
              No matching doctors found in database.
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}

export default DoctorRecommendationCard;
