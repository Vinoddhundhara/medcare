import { useState } from "react";
import { useRoute, useParams, Link } from "wouter";
import {
  useHospitalDetails, useHospitalDepartmentsPublic,
  useHospitalDoctorsPublic, useHospitalReviewsPublic,
} from "@/hooks/use-hospital-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin, Phone, Clock, Globe, Ambulance, Car, Activity,
  Bed, Star, ChevronLeft, Stethoscope, Building2,
} from "lucide-react";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(rating) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`} />
      ))}
    </div>
  );
}

function DoctorCard({ doctor }: { doctor: any }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 font-bold text-xl shrink-0">
            {doctor.profileImage ? (
              <img src={doctor.profileImage} alt={doctor.user?.name} className="w-14 h-14 rounded-full object-cover" />
            ) : (
              doctor.user?.name?.[0]?.toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold truncate">{doctor.user?.name}</h3>
            <p className="text-sm text-blue-600 font-medium">{doctor.specialization}</p>
            {doctor.department && (
              <p className="text-xs text-muted-foreground">{doctor.department.name}</p>
            )}
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span>{doctor.experience} yrs exp</span>
              <span>•</span>
              <span className="font-medium text-foreground">₹{doctor.consultationFee}</span>
            </div>
            {doctor.languages?.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">🗣 {doctor.languages.join(", ")}</p>
            )}
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Link href={`/doctors`}>
            <Button size="sm" className="h-8 text-xs">Book Appointment</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HospitalDetails() {
  // useParams works when rendered inside a <Route path="/hospitals/:id"> 
  const params = useParams<{ id: string }>();
  const hospitalId = params?.id ? parseInt(params.id) : null;
  const [deptFilter, setDeptFilter] = useState<number | undefined>();

  const { data: hospital, isLoading: loadingH } = useHospitalDetails(hospitalId);
  const { data: departments }  = useHospitalDepartmentsPublic(hospitalId);
  const { data: doctors }      = useHospitalDoctorsPublic(hospitalId, { departmentId: deptFilter });
  const { data: reviewData }   = useHospitalReviewsPublic(hospitalId);

  if (loadingH) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Building2 className="w-12 h-12 mx-auto mb-3" />
        <p>Hospital not found</p>
        <Link href="/hospitals"><Button className="mt-4" variant="outline">Back to Hospitals</Button></Link>
      </div>
    );
  }

  const isOpen = () => {
    if (!hospital.openingTime || !hospital.closingTime) return true;
    const now = new Date();
    const [oh, om] = hospital.openingTime.split(":").map(Number);
    const [ch, cm] = hospital.closingTime.split(":").map(Number);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const openMins = oh * 60 + om;
    const closeMins = ch * 60 + cm;
    if (closeMins === 0 || hospital.closingTime === "23:59") return true;
    return nowMins >= openMins && nowMins <= closeMins;
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      {/* Back nav */}
      <div className="px-6 pt-6">
        <Link href="/hospitals">
          <a className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ChevronLeft className="w-4 h-4" /> Back to Hospitals
          </a>
        </Link>
      </div>

      {/* Hero */}
      <div className="relative h-64 overflow-hidden mx-6 rounded-2xl">
        {hospital.hospitalImage || hospital.imageUrl ? (
          <img src={hospital.hospitalImage || hospital.imageUrl} alt={hospital.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-300 dark:from-blue-950 dark:to-blue-800 flex items-center justify-center">
            <Building2 className="w-20 h-20 text-blue-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-5 right-5 text-white">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold">{hospital.name}</h1>
              <div className="flex items-center gap-1.5 mt-0.5 text-sm text-white/80">
                <MapPin className="w-4 h-4" /> {hospital.address}, {hospital.city}
              </div>
            </div>
            <Badge className={`${isOpen() ? "bg-green-500" : "bg-red-500"} text-white border-0`}>
              {isOpen() ? "Open Now" : "Closed"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Quick info bar */}
      <div className="mx-6 mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Phone, label: "Contact",  val: hospital.phone || hospital.contact },
          { icon: Phone, label: "Emergency",val: hospital.emergencyNumber || "N/A" },
          { icon: Clock, label: "Hours",    val: `${hospital.openingTime}–${hospital.closingTime === "23:59" ? "24/7" : hospital.closingTime}` },
          { icon: Globe, label: "Website",  val: hospital.website ? "Visit website" : "N/A" },
        ].map(({ icon: Icon, label, val }) => (
          <Card key={label}>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  {label === "Website" && hospital.website ? (
                    <a href={hospital.website} target="_blank" rel="noopener" className="text-xs font-medium text-blue-600 truncate block">Visit</a>
                  ) : (
                    <p className="text-xs font-medium truncate">{val}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Facilities */}
      <div className="mx-6 mt-4 flex flex-wrap gap-2">
        {hospital.ambulanceAvailable && <Badge variant="outline" className="gap-1"><Ambulance className="w-3.5 h-3.5" />Ambulance</Badge>}
        {hospital.parkingAvailable   && <Badge variant="outline" className="gap-1"><Car className="w-3.5 h-3.5" />Parking</Badge>}
        {hospital.icuAvailable       && <Badge variant="outline" className="gap-1 text-red-600 border-red-300">ICU Available</Badge>}
        {hospital.bedCount > 0       && <Badge variant="outline" className="gap-1"><Bed className="w-3.5 h-3.5" />{hospital.bedCount} Beds</Badge>}
        {hospital.doctorCount > 0    && <Badge variant="outline" className="gap-1"><Stethoscope className="w-3.5 h-3.5" />{hospital.doctorCount} Doctors</Badge>}
        {hospital.averageRating > 0  && (
          <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-300">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            {Number(hospital.averageRating).toFixed(1)} Rating
          </Badge>
        )}
      </div>

      {/* Tabs */}
      <div className="mx-6 mt-6">
        <Tabs defaultValue="about">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="departments">Departments ({departments?.length || 0})</TabsTrigger>
            <TabsTrigger value="doctors">Doctors ({doctors?.length || 0})</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({reviewData?.reviews?.length || 0})</TabsTrigger>
          </TabsList>

          {/* About */}
          <TabsContent value="about" className="mt-4">
            <Card>
              <CardContent className="pt-5">
                {hospital.description ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">{hospital.description}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No description available.</p>
                )}
                {hospital.specializations?.length > 0 && (
                  <div className="mt-4">
                    <p className="font-medium text-sm mb-2">Specializations</p>
                    <div className="flex flex-wrap gap-2">
                      {hospital.specializations.map((s: string) => (
                        <Badge key={s} variant="secondary">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Departments */}
          <TabsContent value="departments" className="mt-4">
            {!departments?.length ? (
              <p className="text-muted-foreground text-sm">No departments listed.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {departments.map((d: any) => (
                  <Card key={d.id} className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setDeptFilter(deptFilter === d.id ? undefined : d.id)}>
                    <CardContent className="pt-4 pb-4">
                      <h3 className="font-medium">{d.name}</h3>
                      {d.description && <p className="text-xs text-muted-foreground mt-0.5">{d.description}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Doctors */}
          <TabsContent value="doctors" className="mt-4 space-y-4">
            {departments?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={!deptFilter ? "default" : "outline"} onClick={() => setDeptFilter(undefined)} className="h-7 text-xs">
                  All
                </Button>
                {departments.map((d: any) => (
                  <Button key={d.id} size="sm" variant={deptFilter === d.id ? "default" : "outline"}
                    onClick={() => setDeptFilter(deptFilter === d.id ? undefined : d.id)} className="h-7 text-xs">
                    {d.name}
                  </Button>
                ))}
              </div>
            )}
            {!doctors?.length ? (
              <p className="text-muted-foreground text-sm">No doctors found.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {doctors.map((d: any) => <DoctorCard key={d.id} doctor={d} />)}
              </div>
            )}
          </TabsContent>

          {/* Reviews */}
          <TabsContent value="reviews" className="mt-4 space-y-4">
            {reviewData?.averageRating > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-yellow-500">{Number(reviewData.averageRating).toFixed(1)}</span>
                <StarRating rating={reviewData.averageRating} />
                <span className="text-sm text-muted-foreground">({reviewData.reviews.length} reviews)</span>
              </div>
            )}
            {!reviewData?.reviews?.length ? (
              <p className="text-muted-foreground text-sm">No reviews yet.</p>
            ) : (
              reviewData.reviews.map((r: any) => (
                <Card key={r.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 font-bold text-sm">
                          {r.patient?.user?.name?.[0]?.toUpperCase() || "P"}
                        </div>
                        <span className="font-medium text-sm">{r.patient?.user?.name || "Patient"}</span>
                      </div>
                      <StarRating rating={r.rating} />
                    </div>
                    {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
