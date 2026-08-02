import { relations } from 'drizzle-orm'
import {
  appointmentSources,
  appointments,
  appointmentStatuses,
  appointmentTypes,
  bedAssignments,
  bedEvents,
  beds,
  billingLedgerEntries,
  careEpisodes,
  clinicalAttachmentAccessLogs,
  clinicalAttachments,
  clinicalEncounters,
  emergencyContacts,
  encounterProducts,
  encounterServices,
  encounterVitals,
  insurers,
  inventoryBatches,
  inventoryCategories,
  inventoryLocations,
  inventoryStock,
  invoiceItems,
  invoices,
  medicalRecords,
  operatingRoomAssignments,
  operatingRoomEvents,
  operatingRooms,
  patientImages,
  patientMovements,
  patients,
  paymentMethods,
  permissionAuditLogs,
  permissions,
  products,
  promotions,
  purchaseItems,
  purchases,
  rolePermissions,
  roles,
  services,
  staffMembers,
  stockMovements,
  suppliers,
  userPermissions,
  userProfiles,
  users,
} from './tenant'

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
  permissions: many(rolePermissions),
}))

export const permissionsRelations = relations(permissions, ({ many }) => ({
  roles: many(rolePermissions),
  users: many(userPermissions),
}))

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, { fields: [rolePermissions.permissionId], references: [permissions.id] }),
}))

export const usersRelations = relations(users, ({ many, one }) => ({
  role: one(roles, { fields: [users.roleId], references: [roles.id] }),
  profile: one(userProfiles),
  staffMember: one(staffMembers),
  permissions: many(userPermissions),
  permissionAuditLogs: many(permissionAuditLogs),
  movements: many(patientMovements),
  clinicalAttachments: many(clinicalAttachments),
}))

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, { fields: [userProfiles.userId], references: [users.id] }),
}))

export const userPermissionsRelations = relations(userPermissions, ({ one }) => ({
  user: one(users, { fields: [userPermissions.userId], references: [users.id] }),
  permission: one(permissions, { fields: [userPermissions.permissionId], references: [permissions.id] }),
}))

export const permissionAuditLogsRelations = relations(permissionAuditLogs, ({ one }) => ({
  actor: one(users, { fields: [permissionAuditLogs.actorId], references: [users.id] }),
}))

export const staffMembersRelations = relations(staffMembers, ({ many, one }) => ({
  user: one(users, { fields: [staffMembers.userId], references: [users.id] }),
  appointments: many(appointments),
  encounters: many(clinicalEncounters),
  careEpisodes: many(careEpisodes),
  invoices: many(invoices),
  bedAssignments: many(bedAssignments),
  operatingRoomAssignments: many(operatingRoomAssignments),
}))

export const patientsRelations = relations(patients, ({ many }) => ({
  emergencyContacts: many(emergencyContacts),
  images: many(patientImages),
  appointments: many(appointments),
  encounters: many(clinicalEncounters),
  careEpisodes: many(careEpisodes),
  invoices: many(invoices),
  movements: many(patientMovements),
  ledgerEntries: many(billingLedgerEntries),
  attachments: many(clinicalAttachments),
  bedAssignments: many(bedAssignments),
  operatingRoomAssignments: many(operatingRoomAssignments),
}))

export const emergencyContactsRelations = relations(emergencyContacts, ({ one }) => ({
  patient: one(patients, { fields: [emergencyContacts.patientId], references: [patients.id] }),
}))

export const patientImagesRelations = relations(patientImages, ({ one }) => ({
  patient: one(patients, { fields: [patientImages.patientId], references: [patients.id] }),
}))

export const inventoryCategoriesRelations = relations(inventoryCategories, ({ many }) => ({
  products: many(products),
}))

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  products: many(products),
  purchases: many(purchases),
}))

export const productsRelations = relations(products, ({ many, one }) => ({
  category: one(inventoryCategories, { fields: [products.categoryId], references: [inventoryCategories.id] }),
  supplier: one(suppliers, { fields: [products.supplierId], references: [suppliers.id] }),
  stock: many(inventoryStock),
  batches: many(inventoryBatches),
  purchaseItems: many(purchaseItems),
  invoiceItems: many(invoiceItems),
  encounterProducts: many(encounterProducts),
  stockMovements: many(stockMovements),
  ledgerEntries: many(billingLedgerEntries),
}))

export const inventoryLocationsRelations = relations(inventoryLocations, ({ many }) => ({
  stock: many(inventoryStock),
  batches: many(inventoryBatches),
  outgoingMovements: many(stockMovements, { relationName: 'stockMovementFromLocation' }),
  incomingMovements: many(stockMovements, { relationName: 'stockMovementToLocation' }),
}))

export const inventoryStockRelations = relations(inventoryStock, ({ one }) => ({
  product: one(products, { fields: [inventoryStock.productId], references: [products.id] }),
  location: one(inventoryLocations, { fields: [inventoryStock.locationId], references: [inventoryLocations.id] }),
}))

export const inventoryBatchesRelations = relations(inventoryBatches, ({ many, one }) => ({
  product: one(products, { fields: [inventoryBatches.productId], references: [products.id] }),
  location: one(inventoryLocations, { fields: [inventoryBatches.locationId], references: [inventoryLocations.id] }),
  purchaseItems: many(purchaseItems),
}))

export const purchasesRelations = relations(purchases, ({ many, one }) => ({
  supplier: one(suppliers, { fields: [purchases.supplierId], references: [suppliers.id] }),
  paymentMethod: one(paymentMethods, { fields: [purchases.paymentMethodId], references: [paymentMethods.id] }),
  items: many(purchaseItems),
}))

export const purchaseItemsRelations = relations(purchaseItems, ({ many, one }) => ({
  purchase: one(purchases, { fields: [purchaseItems.purchaseId], references: [purchases.id] }),
  product: one(products, { fields: [purchaseItems.productId], references: [products.id] }),
  batch: one(inventoryBatches, { fields: [purchaseItems.batchId], references: [inventoryBatches.id] }),
  stockMovements: many(stockMovements),
}))

export const paymentMethodsRelations = relations(paymentMethods, ({ many }) => ({
  invoices: many(invoices),
  purchases: many(purchases),
}))

export const insurersRelations = relations(insurers, ({ many }) => ({
  invoices: many(invoices),
}))

export const promotionsRelations = relations(promotions, ({ many }) => ({
  invoices: many(invoices),
}))

export const servicesRelations = relations(services, ({ many }) => ({
  invoiceItems: many(invoiceItems),
  encounterServices: many(encounterServices),
  ledgerEntries: many(billingLedgerEntries),
}))

export const careEpisodesRelations = relations(careEpisodes, ({ many, one }) => ({
  patient: one(patients, { fields: [careEpisodes.patientId], references: [patients.id] }),
  staffMember: one(staffMembers, { fields: [careEpisodes.staffMemberId], references: [staffMembers.id] }),
  invoice: one(invoices),
  encounters: many(clinicalEncounters),
  movements: many(patientMovements),
  ledgerEntries: many(billingLedgerEntries),
}))

export const invoicesRelations = relations(invoices, ({ many, one }) => ({
  patient: one(patients, { fields: [invoices.patientId], references: [patients.id] }),
  staffMember: one(staffMembers, { fields: [invoices.staffMemberId], references: [staffMembers.id] }),
  careEpisode: one(careEpisodes, { fields: [invoices.careEpisodeId], references: [careEpisodes.id] }),
  paymentMethod: one(paymentMethods, { fields: [invoices.paymentMethodId], references: [paymentMethods.id] }),
  insurer: one(insurers, { fields: [invoices.insurerId], references: [insurers.id] }),
  promotion: one(promotions, { fields: [invoices.promotionId], references: [promotions.id] }),
  items: many(invoiceItems),
  encounters: many(clinicalEncounters),
  ledgerEntries: many(billingLedgerEntries),
}))

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
  product: one(products, { fields: [invoiceItems.productId], references: [products.id] }),
  service: one(services, { fields: [invoiceItems.serviceId], references: [services.id] }),
}))

export const patientMovementsRelations = relations(patientMovements, ({ one }) => ({
  patient: one(patients, { fields: [patientMovements.patientId], references: [patients.id] }),
  careEpisode: one(careEpisodes, { fields: [patientMovements.careEpisodeId], references: [careEpisodes.id] }),
  actor: one(users, { fields: [patientMovements.actorId], references: [users.id] }),
}))

export const billingLedgerEntriesRelations = relations(billingLedgerEntries, ({ one }) => ({
  patient: one(patients, { fields: [billingLedgerEntries.patientId], references: [patients.id] }),
  careEpisode: one(careEpisodes, { fields: [billingLedgerEntries.careEpisodeId], references: [careEpisodes.id] }),
  invoice: one(invoices, { fields: [billingLedgerEntries.invoiceId], references: [invoices.id] }),
  product: one(products, { fields: [billingLedgerEntries.productId], references: [products.id] }),
  service: one(services, { fields: [billingLedgerEntries.serviceId], references: [services.id] }),
}))

export const clinicalEncountersRelations = relations(clinicalEncounters, ({ many, one }) => ({
  patient: one(patients, { fields: [clinicalEncounters.patientId], references: [patients.id] }),
  staffMember: one(staffMembers, { fields: [clinicalEncounters.staffMemberId], references: [staffMembers.id] }),
  careEpisode: one(careEpisodes, { fields: [clinicalEncounters.careEpisodeId], references: [careEpisodes.id] }),
  invoice: one(invoices, { fields: [clinicalEncounters.invoiceId], references: [invoices.id] }),
  vitals: one(encounterVitals),
  medicalRecord: one(medicalRecords),
  products: many(encounterProducts),
  services: many(encounterServices),
  attachments: many(clinicalAttachments),
  stockMovements: many(stockMovements),
}))

export const encounterVitalsRelations = relations(encounterVitals, ({ one }) => ({
  encounter: one(clinicalEncounters, { fields: [encounterVitals.clinicalEncounterId], references: [clinicalEncounters.id] }),
}))

export const medicalRecordsRelations = relations(medicalRecords, ({ one }) => ({
  encounter: one(clinicalEncounters, { fields: [medicalRecords.clinicalEncounterId], references: [clinicalEncounters.id] }),
}))

export const encounterProductsRelations = relations(encounterProducts, ({ one }) => ({
  encounter: one(clinicalEncounters, { fields: [encounterProducts.clinicalEncounterId], references: [clinicalEncounters.id] }),
  product: one(products, { fields: [encounterProducts.productId], references: [products.id] }),
}))

export const encounterServicesRelations = relations(encounterServices, ({ one }) => ({
  encounter: one(clinicalEncounters, { fields: [encounterServices.clinicalEncounterId], references: [clinicalEncounters.id] }),
  service: one(services, { fields: [encounterServices.serviceId], references: [services.id] }),
}))

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, { fields: [stockMovements.productId], references: [products.id] }),
  fromLocation: one(inventoryLocations, {
    fields: [stockMovements.fromLocationId],
    references: [inventoryLocations.id],
    relationName: 'stockMovementFromLocation',
  }),
  toLocation: one(inventoryLocations, {
    fields: [stockMovements.toLocationId],
    references: [inventoryLocations.id],
    relationName: 'stockMovementToLocation',
  }),
  encounter: one(clinicalEncounters, { fields: [stockMovements.clinicalEncounterId], references: [clinicalEncounters.id] }),
  purchaseItem: one(purchaseItems, { fields: [stockMovements.purchaseItemId], references: [purchaseItems.id] }),
  actor: one(users, { fields: [stockMovements.actorId], references: [users.id] }),
}))

export const clinicalAttachmentsRelations = relations(clinicalAttachments, ({ many, one }) => ({
  patient: one(patients, { fields: [clinicalAttachments.patientId], references: [patients.id] }),
  encounter: one(clinicalEncounters, { fields: [clinicalAttachments.clinicalEncounterId], references: [clinicalEncounters.id] }),
  uploader: one(users, { fields: [clinicalAttachments.uploadedBy], references: [users.id] }),
  accessLogs: many(clinicalAttachmentAccessLogs),
}))

export const clinicalAttachmentAccessLogsRelations = relations(clinicalAttachmentAccessLogs, ({ one }) => ({
  attachment: one(clinicalAttachments, {
    fields: [clinicalAttachmentAccessLogs.attachmentId],
    references: [clinicalAttachments.id],
  }),
  user: one(users, { fields: [clinicalAttachmentAccessLogs.accessedBy], references: [users.id] }),
}))

export const appointmentTypesRelations = relations(appointmentTypes, ({ many }) => ({
  appointments: many(appointments),
}))

export const appointmentStatusesRelations = relations(appointmentStatuses, ({ many }) => ({
  appointments: many(appointments),
}))

export const appointmentSourcesRelations = relations(appointmentSources, ({ many }) => ({
  appointments: many(appointments),
}))

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  type: one(appointmentTypes, { fields: [appointments.typeId], references: [appointmentTypes.id] }),
  status: one(appointmentStatuses, { fields: [appointments.statusId], references: [appointmentStatuses.id] }),
  source: one(appointmentSources, { fields: [appointments.sourceId], references: [appointmentSources.id] }),
  staffMember: one(staffMembers, { fields: [appointments.staffMemberId], references: [staffMembers.id] }),
  patient: one(patients, { fields: [appointments.patientId], references: [patients.id] }),
  bed: one(beds, { fields: [appointments.bedId], references: [beds.id] }),
  operatingRoom: one(operatingRooms, { fields: [appointments.operatingRoomId], references: [operatingRooms.id] }),
  creator: one(users, { fields: [appointments.createdBy], references: [users.id] }),
}))

export const bedsRelations = relations(beds, ({ many }) => ({
  assignments: many(bedAssignments),
  events: many(bedEvents),
  appointments: many(appointments),
}))

export const bedAssignmentsRelations = relations(bedAssignments, ({ many, one }) => ({
  bed: one(beds, { fields: [bedAssignments.bedId], references: [beds.id] }),
  patient: one(patients, { fields: [bedAssignments.patientId], references: [patients.id] }),
  staffMember: one(staffMembers, { fields: [bedAssignments.staffMemberId], references: [staffMembers.id] }),
  careEpisode: one(careEpisodes, { fields: [bedAssignments.careEpisodeId], references: [careEpisodes.id] }),
  events: many(bedEvents),
}))

export const bedEventsRelations = relations(bedEvents, ({ one }) => ({
  bed: one(beds, { fields: [bedEvents.bedId], references: [beds.id] }),
  assignment: one(bedAssignments, { fields: [bedEvents.assignmentId], references: [bedAssignments.id] }),
  actor: one(users, { fields: [bedEvents.actorId], references: [users.id] }),
}))

export const operatingRoomsRelations = relations(operatingRooms, ({ many }) => ({
  assignments: many(operatingRoomAssignments),
  events: many(operatingRoomEvents),
  appointments: many(appointments),
}))

export const operatingRoomAssignmentsRelations = relations(operatingRoomAssignments, ({ many, one }) => ({
  operatingRoom: one(operatingRooms, {
    fields: [operatingRoomAssignments.operatingRoomId],
    references: [operatingRooms.id],
  }),
  patient: one(patients, { fields: [operatingRoomAssignments.patientId], references: [patients.id] }),
  staffMember: one(staffMembers, {
    fields: [operatingRoomAssignments.staffMemberId],
    references: [staffMembers.id],
  }),
  careEpisode: one(careEpisodes, {
    fields: [operatingRoomAssignments.careEpisodeId],
    references: [careEpisodes.id],
  }),
  events: many(operatingRoomEvents),
}))

export const operatingRoomEventsRelations = relations(operatingRoomEvents, ({ one }) => ({
  operatingRoom: one(operatingRooms, {
    fields: [operatingRoomEvents.operatingRoomId],
    references: [operatingRooms.id],
  }),
  assignment: one(operatingRoomAssignments, {
    fields: [operatingRoomEvents.assignmentId],
    references: [operatingRoomAssignments.id],
  }),
  actor: one(users, { fields: [operatingRoomEvents.actorId], references: [users.id] }),
}))
