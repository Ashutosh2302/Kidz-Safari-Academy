/** Shared filters for active vs archived students */

export const activeStudentWhere = { archivedAt: null } as const;

export function studentActiveWhere(includeArchived = false) {
  return includeArchived ? {} : activeStudentWhere;
}

export function isStudentArchived(student: { archivedAt: Date | null }) {
  return student.archivedAt != null;
}
