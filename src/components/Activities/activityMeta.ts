import type { ActivityGroup, ActivityStatus } from '../../lib/types'

export const ACTIVITY_GROUPS: ActivityGroup[] = ['checkin', 'challenge', 'trial', 'welfare', 'reflow', 'guide', 'other']
export const ACTIVITY_STATUSES: ActivityStatus[] = ['ongoing', 'permanent', 'upcoming', 'expired']

export const ACTIVITY_GROUP_LABEL_KEYS: Record<ActivityGroup, string> = {
  checkin: 'activity.groupCheckin',
  challenge: 'activity.groupChallenge',
  trial: 'activity.groupTrial',
  welfare: 'activity.groupWelfare',
  reflow: 'activity.groupReflow',
  guide: 'activity.groupGuide',
  other: 'activity.groupOther',
}

export const ACTIVITY_STATUS_LABEL_KEYS: Record<ActivityStatus, string> = {
  ongoing: 'activity.statusOngoing',
  permanent: 'activity.statusPermanent',
  upcoming: 'activity.statusUpcoming',
  expired: 'activity.statusExpired',
}
