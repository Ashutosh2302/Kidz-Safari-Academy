import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { ChildAvatar } from "@/components/ChildAvatar";
import { DashDivider } from "@/components/DashDivider";
import { MediaCarousel } from "@/components/MediaCarousel";
import {
  ParentExtrasModals,
  ParentExtrasProvider,
} from "@/components/ParentExtrasModals";
import {
  INLINE_LEAP_LIMIT,
  ParentThisWeek,
} from "@/components/ParentThisWeek";
import { WithUsSince } from "@/components/WithUsSince";
import {
  consecutiveClassStreak,
  presentHours,
} from "@/lib/attendance-stats";
import { milestoneLeapDescription, ordinal } from "@/lib/copy";
import { firstName } from "@/lib/dates";
import { extractMagicToken } from "@/lib/magic-link";
import { prisma } from "@/lib/prisma";
import {
  dayNumberBySessionId,
  distinctSessionDayCount,
} from "@/lib/session-day";
import { teacherAttribution } from "@/lib/teacher";

function formatSessionDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function isVideoUrl(url: string) {
  return /\.(mp4|mov|webm)(\?|$)/i.test(url) || url.includes("video");
}

export default async function ParentPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: segment } = await params;
  // `/s/{slug}-{token}` or legacy `/s/{token}` — only the token authenticates
  const token = extractMagicToken(segment);

  const student = await prisma.student.findUnique({
    where: { magicLinkToken: token },
    include: {
      sessions: {
        orderBy: { sessionDate: "desc" },
        include: { photos: { orderBy: { createdAt: "asc" } } },
      },
      attendance: { orderBy: { date: "desc" } },
      milestones: {
        include: { milestone: true },
        orderBy: { achievedDate: "desc" },
      },
    },
  });

  if (!student) {
    notFound();
  }

  if (student.archivedAt) {
    const name = firstName(student.name);
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
        <BrandLogo height={64} />
        <h1 className="mt-8 font-display text-3xl font-bold text-forest">
          {name} is no longer enrolled
        </h1>
        <p className="mt-3 text-ink-soft">
          This Gentle Sprouts journey has paused. If you think this is a
          mistake, please reach out to the academy.
        </p>
      </main>
    );
  }

  const name = firstName(student.name);
  const sessionCount = distinctSessionDayCount(student.sessions);
  const photoCount = student.sessions.reduce(
    (n, s) => n + s.photos.length,
    0,
  );
  const hoursSinceJoining = presentHours(student.attendance);
  const classStreak = consecutiveClassStreak(student.attendance);
  const isNewJourney = sessionCount === 0;

  // Most recent leaps for the compact This Week strip (same tiles as All leaps)
  const recentMilestones = student.milestones
    .slice(0, INLINE_LEAP_LIMIT)
    .map((m) => ({
      id: m.id,
      name: m.milestone.name,
      category: m.milestone.category,
      icon: m.milestone.icon,
      description:
        m.note?.trim() ||
        milestoneLeapDescription(name, m.milestone.category),
    }));

  const dayNumberById = dayNumberBySessionId(student.sessions);

  const attendancePayload = student.attendance.map((a) => ({
    date: a.date.toISOString(),
    status: a.status,
    note: a.note,
    hoursAttended: a.hoursAttended,
    isExtraClass: a.isExtraClass,
  }));
  const milestonesPayload = student.milestones.map((m) => ({
    id: m.id,
    achievedDate: m.achievedDate.toISOString(),
    note: m.note,
    milestone: m.milestone,
  }));

  return (
    <ParentExtrasProvider
      name={name}
      attendance={attendancePayload}
      milestones={milestonesPayload}
    >
    <main className="parent-journal min-h-screen overflow-x-hidden">
      <header className="hero-band border-b-4 border-yellow px-5 py-4 sm:px-8 sm:py-5 lg:px-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <BrandLogo height={52} />
              <div className="min-w-0">
                <p className="font-display text-base font-bold leading-tight text-yellow sm:text-lg">
                  Gentle Sprouts Academy
                </p>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-yellow/80">
                  at Kidz Safari
                </p>
              </div>
            </div>
            <ParentExtrasModals
              presentHours={hoursSinceJoining}
              leapCount={student.milestones.length}
              sessionCount={sessionCount}
              photoCount={photoCount}
              classStreak={classStreak}
            />
          </div>

          <div className="flex min-w-0 items-center gap-3">
            <ChildAvatar name={name} photoUrl={student.photoUrl} size="lg" />
            <h1 className="min-w-0 font-display text-xl font-bold leading-tight text-yellow sm:text-2xl">
              {isNewJourney ? (
                <>
                  <span className="text-white">{name}</span>
                  &apos;s journey with us starts here! 🌱
                </>
              ) : (
                <>
                  Here&apos;s what{" "}
                  <span className="text-white">{name}</span> got up to
                </>
              )}
            </h1>
          </div>
        </div>
      </header>

      <WithUsSince joinedOn={student.enrolledOn} />

      <section className="relative px-5 py-5 sm:px-8 sm:py-6 lg:px-12">
        <div className="relative mx-auto max-w-6xl space-y-5">
          <ParentThisWeek
            name={name}
            hoursSinceJoining={hoursSinceJoining}
            milestones={recentMilestones}
            totalLeapCount={student.milestones.length}
            joinedOn={student.enrolledOn.toISOString()}
            memoryPhotos={student.sessions.flatMap((session) =>
              session.photos.map((p) => ({
                id: p.id,
                url: p.photoUrl,
                isHighlight: p.isHighlight,
                sessionDate: session.sessionDate.toISOString(),
                sessionNote: session.notes,
                isVideo: isVideoUrl(p.photoUrl),
              })),
            )}
          />

          <div id="timeline" className="scroll-mt-4">
            <h2 className="font-display text-2xl font-bold text-forest sm:text-3xl">
              A peek into our days
            </h2>
          </div>

          {isNewJourney ? (
            <div className="surface-card overflow-hidden px-6 py-10 text-center sm:px-10">
              <p className="text-4xl" aria-hidden>
                🌱
              </p>
              <p className="mt-3 font-display text-2xl font-bold text-forest sm:text-3xl">
                {name}&apos;s story is just beginning
              </p>
              <p className="mx-auto mt-3 max-w-lg text-ink-soft">
                Check back after {name}&apos;s first class for photos, notes,
                and tiny leaps. The garden above will grow with every
                screen-free hour.
              </p>
            </div>
          ) : (
            <ol className="space-y-8 sm:space-y-10">
              {student.sessions.map((session, index) => {
                const flip = index % 2 === 1;
                const hasPhotos = session.photos.length > 0;
                const dayNum = dayNumberById.get(session.id) ?? index + 1;
                const attribution = teacherAttribution(session.createdBy);

                return (
                  <li
                    key={session.id}
                    className="animate-fade-up"
                    style={{ animationDelay: `${Math.min(index, 5) * 50}ms` }}
                  >
                    {index > 0 && <DashDivider className="mb-6 sm:mb-8" />}

                    <article
                      className={`grid items-start gap-4 lg:gap-8 ${
                        hasPhotos ? "lg:grid-cols-2" : "lg:max-w-2xl"
                      }`}
                    >
                      <div
                        className={`surface-card relative p-4 sm:p-5 ${
                          flip && hasPhotos ? "lg:order-2" : ""
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <time
                            dateTime={session.sessionDate.toISOString()}
                            className="pill-yellow"
                          >
                            {formatSessionDate(session.sessionDate)}
                          </time>
                          <span className="rounded-full border-2 border-forest bg-mint px-2.5 py-1 text-xs font-bold text-forest">
                            {ordinal(dayNum)} class together
                          </span>
                        </div>

                        <p className="mt-3 whitespace-pre-wrap font-display text-xl font-semibold leading-snug text-forest sm:text-2xl">
                          {session.notes}
                        </p>
                        {session.notes.trim() && (
                          <p className="mt-1.5 text-sm italic text-forest-soft/80">
                            — {attribution}
                          </p>
                        )}

                        {session.activityCategory ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-pastel-yellow px-2.5 py-1 text-xs font-bold text-forest">
                              {session.activityCategory}
                            </span>
                          </div>
                        ) : null}
                      </div>

                      {hasPhotos && (
                        <div className={flip ? "lg:order-1" : undefined}>
                          <MediaCarousel
                            altFallback={`A moment from class with ${name}`}
                            slides={session.photos.map((photo) => ({
                              id: photo.id,
                              url: photo.photoUrl,
                              caption: photo.caption,
                              isVideo: isVideoUrl(photo.photoUrl),
                            }))}
                          />
                        </div>
                      )}
                    </article>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>

      <footer className="border-t-2 border-dashed border-forest bg-mint px-6 py-8 text-center sm:px-10">
        <p className="font-display text-lg font-bold text-forest">
          With care from Gentle Sprouts Academy
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          Tiny steps today. Giant leaps tomorrow.
        </p>
      </footer>
    </main>
    </ParentExtrasProvider>
  );
}
