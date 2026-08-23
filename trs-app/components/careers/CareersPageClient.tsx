"use client";

import { CmsHeroMedia } from "@/components/site/CmsHeroMedia";
import type { ChangeEvent, FormEvent } from "react";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faAward,
  faBriefcase,
  faCheck,
  faClock,
  faCoins,
  faEnvelope,
  faFileArrowUp,
  faHeart,
  faLocationDot,
  faPeopleGroup,
  faPhone,
  faReceipt,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";
import { useEffect, useMemo, useState } from "react";
import { MediaPlaceholder } from "@/components/site/MediaPlaceholder";

type EmploymentType = "Full-time" | "Part-time" | "Full-time / Part-time" | "Internship";

type Job = {
  id: string;
  title: string;
  employmentType: EmploymentType;
  location: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
};

type Benefit = {
  icon: IconDefinition;
  title: string;
  text: string;
};

type ApplicationForm = {
  name: string;
  phone: string;
  email: string;
  position: string;
  experience: string;
  message: string;
  consent: boolean;
};

const benefits: Benefit[] = [
  {
    icon: faAward,
    title: "Career Growth",
    text: "Learn new skills and grow with the TRS team.",
  },
  {
    icon: faPeopleGroup,
    title: "Team Culture",
    text: "Work with a friendly and energetic team.",
  },
  {
    icon: faCoins,
    title: "Fair Compensation",
    text: "Role-based salary with performance recognition.",
  },
  {
    icon: faClock,
    title: "Practical Shifts",
    text: "Shift planning based on business requirements.",
  },
  {
    icon: faHeart,
    title: "Recognition",
    text: "Good work, discipline and reliability are valued.",
  },
  {
    icon: faUtensils,
    title: "Staff Benefits",
    text: "Food and employee benefits as per company policy.",
  },
];

const applicationSteps: Benefit[] = [
  {
    icon: faBriefcase,
    title: "Choose a Role",
    text: "Select a position matching your interests and experience.",
  },
  {
    icon: faReceipt,
    title: "Complete the Form",
    text: "Enter your contact, work and availability details.",
  },
  {
    icon: faFileArrowUp,
    title: "Upload Resume",
    text: "Attach your latest resume in PDF, DOC or DOCX format.",
  },
  {
    icon: faEnvelope,
    title: "Submit Application",
    text: "Our team will review your application.",
  },
  {
    icon: faPeopleGroup,
    title: "Interview",
    text: "Shortlisted candidates will be contacted by TRS.",
  },
];

const initialForm: ApplicationForm = {
  name: "",
  phone: "",
  email: "",
  position: "",
  experience: "",
  message: "",
  consent: false,
};

export function CareersPageClient() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/v1/public/careers/jobs", { cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as { data?: Array<Job & { _id?: string; slug?: string }>; message?: string };
        if (!response.ok) throw new Error(json.message || "Unable to load jobs.");
        if (!cancelled) {
          setJobs((json.data || []).map((job) => ({ ...job, id: job._id || job.slug || job.id })));
        }
      })
      .catch(() => { if (!cancelled) setJobs([]); })
      .finally(() => { if (!cancelled) setJobsLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const [selectedJob, setSelectedJob] = useState<string>("all");
  const [expandedJob, setExpandedJob] = useState<string | null | undefined>(undefined);
  const [form, setForm] = useState<ApplicationForm>(initialForm);
  const [resume, setResume] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");


  const visibleJobs = useMemo(
    () =>
      selectedJob === "all"
        ? jobs
        : jobs.filter((job) => job.employmentType === selectedJob),
    [jobs, selectedJob],
  );

  const updateField = <Key extends keyof ApplicationForm>(
    key: Key,
    value: ApplicationForm[Key],
  ): void => {
    setForm((current) => ({ ...current, [key]: value }));

    if (status !== "idle") {
      setStatus("idle");
      setStatusMessage("");
    }
  };

  const selectPosition = (job: Job): void => {
    updateField("position", job.id);

    window.requestAnimationFrame(() => {
      document.getElementById("career-application")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleResume = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setResume(null);
      return;
    }

    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!validTypes.includes(file.type)) {
      setStatus("error");
      setStatusMessage("Upload a PDF, DOC or DOCX resume.");
      event.target.value = "";
      setResume(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setStatus("error");
      setStatusMessage("Resume size must be 5 MB or less.");
      event.target.value = "";
      setResume(null);
      return;
    }

    setResume(file);
  };

  const submitApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (form.name.trim().length < 2) {
      setStatus("error");
      setStatusMessage("Please enter your full name.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) {
      setStatus("error");
      setStatusMessage("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setStatus("error");
      setStatusMessage("Enter a valid email address.");
      return;
    }

    if (!form.position) {
      setStatus("error");
      setStatusMessage("Select the position you are applying for.");
      return;
    }

    if (!form.consent) {
      setStatus("error");
      setStatusMessage("Please confirm that the information is correct.");
      return;
    }

    setStatus("submitting");
    setStatusMessage("");

    try {
      const payload = new FormData();
      payload.append("name", form.name.trim());
      payload.append("phone", form.phone.trim());
      payload.append("email", form.email.trim());
      payload.append("position", form.position);
      payload.append("experience", form.experience.trim());
      payload.append("message", form.message.trim());

      if (resume) {
        payload.append("resume", resume);
      }

      const response = await fetch("/api/v1/careers/apply", {
        method: "POST",
        body: payload,
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message || "Unable to submit application");
      }

      setStatus("success");
      setStatusMessage(
        "Your application has been submitted. The TRS team will contact shortlisted candidates.",
      );
      setForm(initialForm);
      setResume(null);
    } catch {
      setStatus("error");
      setStatusMessage(
        "We could not submit your application right now. Please email your resume to careers@therollingstove.in.",
      );
    }
  };

  return (
    <main className="overflow-x-hidden bg-[#FFFDF9] text-[#172536]">
      <section className="relative overflow-hidden border-b border-[#EDE3D8] bg-[linear-gradient(135deg,#FFFDF9,#FFF6EC)]">
        <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(#E8A53A_1px,transparent_1px)] [background-size:28px_28px]" />

        <div className="relative mx-auto grid min-h-[540px] w-[min(100%-2rem,1320px)] min-w-0 items-center gap-10 py-12 lg:grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)] lg:py-16">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-3 text-sm font-black italic text-[#C8102E]">
              <span className="h-px w-10 bg-[#E8A53A]" />
              Great Food. Great People. Great Vibes.
              <span className="h-px w-10 bg-[#E8A53A]" />
            </div>

            <h1 className="mt-6 max-w-[720px] break-words text-[clamp(3.1rem,8vw,6.1rem)] font-black uppercase leading-[.88] tracking-[-0.055em] text-[#14283B]">
              Join the <span className="text-[#C8102E]">TRS Family</span>
            </h1>

            <p className="mt-6 max-w-[620px] text-base leading-8 text-[#4F4943] sm:text-lg">
              Join a fast-moving food-truck team that values quality,
              discipline, customer service and a positive working environment.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ["Grow Your Career", faAward],
                ["Positive Team", faPeopleGroup],
                ["Learn & Develop", faUtensils],
                ["Staff Benefits", faHeart],
              ].map(([title, icon]) => (
                <article
                  key={String(title)}
                  className="min-w-0 rounded-2xl border border-[#EDE3D8] bg-white/90 p-4 text-center shadow-[0_12px_30px_rgba(44,28,14,.06)]"
                >
                  <span className="mx-auto grid h-11 w-11 place-items-center rounded-full border border-[#E8A53A] bg-[#FFF8EE] text-[#C8102E]">
                    <FontAwesomeIcon icon={icon as IconDefinition} className="h-4" />
                  </span>
                  <strong className="mt-3 block text-[9px] font-black uppercase">
                    {String(title)}
                  </strong>
                </article>
              ))}
            </div>
          </div>

          <div className="relative min-h-[340px] min-w-0 sm:min-h-[460px]">
            <CmsHeroMedia
              pageKey="careers"
              label="TRS careers team hero image"
              className="absolute inset-0 rounded-[2rem] border-[#E8D8C9] bg-[linear-gradient(135deg,#FFF4E3,#F5D5B3)] shadow-[0_28px_70px_rgba(88,56,24,.14)]"
            />
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto w-[min(100%-2rem,1240px)] min-w-0">
          <div className="flex items-center justify-center gap-4">
            <span className="h-px w-16 bg-[#E8A53A]" />
            <h2 className="text-center text-xl font-black uppercase tracking-[-0.03em] sm:text-2xl">
              Why Work With TRS?
            </h2>
            <span className="h-px w-16 bg-[#E8A53A]" />
          </div>

          <div className="mt-8 grid min-w-0 gap-px overflow-hidden rounded-3xl border border-[#EDE3D8] bg-[#EDE3D8] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {benefits.map(({ icon, title, text }) => (
              <article key={title} className="min-w-0 bg-white p-5 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#FFF1E5] text-[#C8102E]">
                  <FontAwesomeIcon icon={icon} className="h-5" />
                </span>
                <h3 className="mt-4 text-[10px] font-black uppercase">{title}</h3>
                <p className="mt-2 text-[9px] leading-4 text-[#655E57]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-12">
        <div className="mx-auto grid w-[min(100%-2rem,1240px)] min-w-0 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
          <section className="min-w-0">
            <div className="flex flex-col gap-4 border-b border-[#EDE3D8] pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#C8102E]">
                  Current Opportunities
                </p>
                <h2 className="mt-2 text-2xl font-black uppercase">Open Positions</h2>
              </div>

              <label className="text-[9px] font-black uppercase">
                Filter Roles
                <select
                  value={selectedJob}
                  onChange={(event) => setSelectedJob(event.target.value)}
                  className="ml-3 h-10 rounded-xl border border-[#E5D9CD] bg-white px-3 text-[10px] normal-case outline-none focus:border-[#C8102E]"
                >
                  <option value="all">All positions</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Full-time / Part-time">
                    Full-time / Part-time
                  </option>
                  <option value="Internship">Internship</option>
                </select>
              </label>
            </div>

            <div className="mt-5 grid gap-3">
              {jobsLoading ? (
                <p className="rounded-2xl border border-[#EDE3D8] bg-white p-6 text-center text-sm font-semibold text-[#655E57]">Loading current openings...</p>
              ) : visibleJobs.length === 0 ? (
                <p className="rounded-2xl border border-[#EDE3D8] bg-white p-6 text-center text-sm font-semibold text-[#655E57]">No matching openings are available right now.</p>
              ) : visibleJobs.map((job) => {
                const expanded = (expandedJob ?? jobs[0]?.id ?? null) === job.id;

                return (
                  <article
                    key={job.id}
                    className="overflow-hidden rounded-2xl border border-[#EDE3D8] bg-white shadow-[0_10px_26px_rgba(50,30,15,.04)]"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedJob(expanded ? null : job.id)
                      }
                      className="flex w-full min-w-0 flex-col gap-4 p-4 text-left sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-black">{job.title}</h3>
                          <span className="rounded-full border border-[#E8B9B5] bg-[#FFF4F2] px-2.5 py-1 text-[8px] font-black uppercase text-[#C8102E]">
                            {job.employmentType}
                          </span>
                        </div>

                        <p className="mt-2 flex items-center gap-2 text-[9px] text-[#655E57]">
                          <FontAwesomeIcon icon={faLocationDot} className="h-3 text-[#C8102E]" />
                          {job.location}
                        </p>

                        <p className="mt-2 text-[10px] leading-5 text-[#655E57]">
                          {job.summary}
                        </p>
                      </div>

                      <span className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#C8102E] px-4 text-[8px] font-black uppercase text-[#C8102E]">
                        {expanded ? "Hide Details" : "View Details"}
                        <FontAwesomeIcon icon={faArrowRight} className="h-3" />
                      </span>
                    </button>

                    {expanded && (
                      <div className="border-t border-[#EDE3D8] bg-[#FFFDF9] p-4">
                        <div className="grid gap-5 sm:grid-cols-2">
                          <div>
                            <h4 className="text-[9px] font-black uppercase text-[#C8102E]">
                              Responsibilities
                            </h4>
                            <div className="mt-3 grid gap-2">
                              {job.responsibilities.map((item) => (
                                <p
                                  key={item}
                                  className="flex gap-2 text-[9px] leading-4 text-[#655E57]"
                                >
                                  <FontAwesomeIcon
                                    icon={faCheck}
                                    className="mt-0.5 h-3 shrink-0 text-[#D99219]"
                                  />
                                  {item}
                                </p>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-[9px] font-black uppercase text-[#C8102E]">
                              Requirements
                            </h4>
                            <div className="mt-3 grid gap-2">
                              {job.requirements.map((item) => (
                                <p
                                  key={item}
                                  className="flex gap-2 text-[9px] leading-4 text-[#655E57]"
                                >
                                  <FontAwesomeIcon
                                    icon={faCheck}
                                    className="mt-0.5 h-3 shrink-0 text-[#D99219]"
                                  />
                                  {item}
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => selectPosition(job)}
                          className="mt-5 inline-flex h-10 items-center gap-3 rounded-xl bg-[#C8102E] px-5 text-[8px] font-black uppercase text-white"
                        >
                          Apply for This Role
                          <FontAwesomeIcon icon={faArrowRight} className="h-3" />
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <div className="grid min-w-0 grid-cols-2 gap-3">
            <MediaPlaceholder
              label="TRS team group photo"
              className="col-span-2 min-h-[250px] rounded-3xl border-[#E8D8C9]"
            />
            <MediaPlaceholder
              label="TRS kitchen team photo"
              className="min-h-[230px] rounded-3xl border-[#E8D8C9]"
            />
            <div className="flex min-h-[230px] flex-col justify-center rounded-3xl bg-[#112536] p-6 text-white">
              <span className="text-4xl font-black text-[#F5C84B]">“</span>
              <p className="mt-2 text-xl font-black leading-8">
                Good people make great food even better.
              </p>
              <p className="mt-4 text-sm font-black italic text-[#F5C84B]">
                — TRS Team
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-12">
        <div className="mx-auto w-[min(100%-2rem,1240px)] min-w-0">
          <div className="flex items-center justify-center gap-4">
            <span className="h-px w-16 bg-[#E8A53A]" />
            <h2 className="text-center text-xl font-black uppercase tracking-[-0.03em] sm:text-2xl">
              How to Apply
            </h2>
            <span className="h-px w-16 bg-[#E8A53A]" />
          </div>

          <div className="mt-8 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {applicationSteps.map(({ icon, title, text }, index) => (
              <article key={title} className="relative min-w-0 text-center">
                <span className="absolute left-2 top-0 grid h-6 w-6 place-items-center rounded-full bg-[#C8102E] text-[9px] font-black text-white">
                  {index + 1}
                </span>
                <span className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-[#E8D8C9] bg-[#FFF7EE] text-[#D99219]">
                  <FontAwesomeIcon icon={icon} className="h-7" />
                </span>
                <h3 className="mt-4 text-[10px] font-black uppercase">{title}</h3>
                <p className="mx-auto mt-2 max-w-[180px] text-[9px] leading-4 text-[#655E57]">
                  {text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="career-application" className="scroll-mt-28 pb-12">
        <div className="mx-auto grid w-[min(100%-2rem,1240px)] min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <form
            onSubmit={submitApplication}
            className="min-w-0 rounded-3xl border border-[#EDE3D8] bg-white p-5 shadow-[0_18px_42px_rgba(50,30,15,.06)] sm:p-7"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#FFF1E5] text-[#C8102E]">
                <FontAwesomeIcon icon={faBriefcase} className="h-5" />
              </span>
              <div>
                <h2 className="text-xl font-black uppercase">Apply to Join TRS</h2>
                <p className="mt-1 text-[10px] leading-5 text-[#655E57]">
                  Complete the form. Shortlisted applicants will be contacted.
                </p>
              </div>
            </div>

            <div className="mt-7 grid min-w-0 gap-4 sm:grid-cols-2">
              <label className="text-[9px] font-black uppercase">
                Full Name *
                <input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  autoComplete="name"
                  className="mt-2 h-11 w-full min-w-0 rounded-xl border border-[#E5D9CD] bg-[#FFFDF9] px-4 text-sm font-medium normal-case outline-none focus:border-[#C8102E]"
                  placeholder="Enter your full name"
                />
              </label>

              <label className="text-[9px] font-black uppercase">
                Mobile Number *
                <input
                  value={form.phone}
                  onChange={(event) =>
                    updateField(
                      "phone",
                      event.target.value.replace(/\D/g, "").slice(0, 10),
                    )
                  }
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  className="mt-2 h-11 w-full min-w-0 rounded-xl border border-[#E5D9CD] bg-[#FFFDF9] px-4 text-sm font-medium normal-case outline-none focus:border-[#C8102E]"
                  placeholder="Enter mobile number"
                />
              </label>

              <label className="text-[9px] font-black uppercase">
                Email Address
                <input
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  type="email"
                  autoComplete="email"
                  className="mt-2 h-11 w-full min-w-0 rounded-xl border border-[#E5D9CD] bg-[#FFFDF9] px-4 text-sm font-medium normal-case outline-none focus:border-[#C8102E]"
                  placeholder="Enter your email"
                />
              </label>

              <label className="text-[9px] font-black uppercase">
                Position *
                <select
                  value={form.position}
                  onChange={(event) => updateField("position", event.target.value)}
                  className="mt-2 h-11 w-full min-w-0 rounded-xl border border-[#E5D9CD] bg-[#FFFDF9] px-4 text-sm font-medium normal-case outline-none focus:border-[#C8102E]"
                >
                  <option value="">Select a position</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-[9px] font-black uppercase">
                Relevant Experience
                <input
                  value={form.experience}
                  onChange={(event) =>
                    updateField("experience", event.target.value)
                  }
                  className="mt-2 h-11 w-full min-w-0 rounded-xl border border-[#E5D9CD] bg-[#FFFDF9] px-4 text-sm font-medium normal-case outline-none focus:border-[#C8102E]"
                  placeholder="Example: 2 years in food service"
                />
              </label>

              <label className="text-[9px] font-black uppercase">
                Resume
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleResume}
                  className="mt-2 block h-11 w-full min-w-0 rounded-xl border border-[#E5D9CD] bg-[#FFFDF9] px-3 py-2 text-[10px] font-medium normal-case file:mr-3 file:rounded-lg file:border-0 file:bg-[#FFF1E5] file:px-3 file:py-1.5 file:text-[8px] file:font-black file:uppercase file:text-[#C8102E]"
                />
                <span className="mt-1 block text-[8px] font-medium normal-case text-[#7A726B]">
                  PDF, DOC or DOCX · Maximum 5 MB
                </span>
              </label>
            </div>

            <label className="mt-4 block text-[9px] font-black uppercase">
              Message / Availability
              <textarea
                value={form.message}
                onChange={(event) => updateField("message", event.target.value)}
                rows={5}
                className="mt-2 w-full resize-y rounded-xl border border-[#E5D9CD] bg-[#FFFDF9] px-4 py-3 text-sm font-medium normal-case outline-none focus:border-[#C8102E]"
                placeholder="Tell us about your availability, experience or anything relevant."
              />
            </label>

            <label className="mt-4 flex items-start gap-3 text-[9px] leading-5 text-[#655E57]">
              <input
                checked={form.consent}
                onChange={(event) => updateField("consent", event.target.checked)}
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#C8102E]"
              />
              I confirm that the information provided is correct and may be
              used by TRS to evaluate my application.
            </label>

            {statusMessage && (
              <div
                role={status === "error" ? "alert" : "status"}
                className={`mt-5 rounded-xl border px-4 py-3 text-xs font-semibold ${
                  status === "success"
                    ? "border-[#B8DFC0] bg-[#F1FBF3] text-[#287238]"
                    : "border-[#F1C6C6] bg-[#FFF3F3] text-[#A50E27]"
                }`}
              >
                {statusMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#C8102E] px-6 text-[10px] font-black uppercase text-white shadow-[0_12px_28px_rgba(200,16,46,.22)] transition hover:bg-[#A50E27] disabled:cursor-not-allowed disabled:opacity-65"
            >
              {status === "submitting" ? "Submitting..." : "Submit Application"}
              <FontAwesomeIcon icon={faArrowRight} className="h-3" />
            </button>
          </form>

          <aside className="min-w-0 space-y-5">
            <section className="rounded-3xl border border-[#EDE3D8] bg-[linear-gradient(135deg,#FFF8ED,#FFF1E2)] p-5 shadow-[0_18px_42px_rgba(50,30,15,.06)]">
              <h2 className="text-lg font-black uppercase">
                Don&apos;t See the Right Role?
              </h2>
              <p className="mt-3 text-[10px] leading-5 text-[#655E57]">
                Email your resume for future opportunities. We will keep it on
                record based on the applicable recruitment policy.
              </p>
              <a
                href="mailto:careers@therollingstove.in?subject=TRS%20Career%20Application"
                className="mt-5 flex min-w-0 items-center gap-3 rounded-xl border border-[#C8102E] px-4 py-3 text-[10px] font-black text-[#C8102E]"
              >
                <FontAwesomeIcon icon={faEnvelope} className="h-4 shrink-0" />
                <span className="min-w-0 break-all">
                  careers@therollingstove.in
                </span>
              </a>
            </section>

            <section className="rounded-3xl border border-[#EDE3D8] bg-white p-5 shadow-[0_18px_42px_rgba(50,30,15,.06)]">
              <h2 className="text-lg font-black uppercase">Work Location</h2>
              <p className="mt-3 flex items-start gap-3 text-[10px] leading-5 text-[#655E57]">
                <FontAwesomeIcon
                  icon={faLocationDot}
                  className="mt-1 h-4 shrink-0 text-[#C8102E]"
                />
                Shastri Circle, Sector-H, Jodhpur, Rajasthan 342003
              </p>
              <p className="mt-3 flex items-center gap-3 text-[10px] text-[#655E57]">
                <FontAwesomeIcon
                  icon={faClock}
                  className="h-4 shrink-0 text-[#D99219]"
                />
                Most roles require evening and weekend availability.
              </p>
              <a
                href="tel:+919166694786"
                className="mt-5 inline-flex h-10 items-center gap-3 rounded-xl border border-[#E5D9CD] px-4 text-[9px] font-black uppercase text-[#172536]"
              >
                <FontAwesomeIcon icon={faPhone} className="h-3" />
                Call TRS
              </a>
            </section>
          </aside>
        </div>
      </section>

      <section className="pb-12">
        <div className="mx-auto flex w-[min(100%-2rem,1240px)] min-w-0 flex-col gap-5 rounded-3xl border border-[#E8D8C9] bg-[linear-gradient(135deg,#FFF8ED,#FFF1E2)] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#C8102E]">
              Ready to build something amazing?
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase">
              Join the TRS team and grow with us.
            </h2>
          </div>

          <a
            href="#career-application"
            className="inline-flex h-12 shrink-0 items-center justify-center gap-3 rounded-xl bg-[#C8102E] px-6 text-[10px] font-black uppercase text-white"
          >
            Apply Now
            <FontAwesomeIcon icon={faArrowRight} className="h-3" />
          </a>
        </div>
      </section>
    </main>
  );
}
