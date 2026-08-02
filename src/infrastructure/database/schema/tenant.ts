import {
  boolean,
  date,
  decimal,
  foreignKey,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core'
import { baseColumns, uuid } from './base'

export const roles = mysqlTable(
  'roles',
  {
    ...baseColumns(),
    name: varchar('name', { length: 100 }).notNull(),
    key: varchar('key', { length: 50 }).notNull(),
    description: text('description'),
  },
  (table) => [
    uniqueIndex('roles_name_unique').on(table.name),
    uniqueIndex('roles_key_unique').on(table.key),
  ],
)

export const permissions = mysqlTable(
  'permissions',
  {
    ...baseColumns(),
    key: varchar('key', { length: 100 }).notNull(),
    description: text('description'),
  },
  (table) => [uniqueIndex('permissions_key_unique').on(table.key)],
)

export const rolePermissions = mysqlTable(
  'role_permissions',
  {
    ...baseColumns(),
    roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    effect: mysqlEnum('effect', ['grant', 'revoke']).notNull().default('grant'),
  },
  (table) => [
    uniqueIndex('role_permissions_role_permission_unique').on(table.roleId, table.permissionId),
    index('role_permissions_permission_idx').on(table.permissionId, table.deletedAt),
  ],
)

export const users = mysqlTable(
  'users',
  {
    ...baseColumns(),
    roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    name: varchar('name', { length: 150 }).notNull(),
    email: varchar('email', { length: 190 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }),
    firebaseId: varchar('firebase_id', { length: 190 }),
    provider: mysqlEnum('provider', ['conventional', 'google']).notNull().default('conventional'),
    accessToken: text('access_token'),
    sessionVersion: int('session_version').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [
    uniqueIndex('users_email_unique').on(table.email),
    uniqueIndex('users_firebase_id_unique').on(table.firebaseId),
    index('users_role_idx').on(table.roleId, table.deletedAt),
    index('users_active_idx').on(table.isActive, table.deletedAt),
  ],
)

export const userProfiles = mysqlTable(
  'user_profiles',
  {
    ...baseColumns(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    phone: varchar('phone', { length: 30 }),
    identification: varchar('identification', { length: 50 }),
    department: varchar('department', { length: 100 }),
    position: varchar('position', { length: 100 }),
    theme: mysqlEnum('theme', ['light', 'dark']).notNull().default('light'),
    avatarDataUrl: text('avatar_data_url'),
  },
  (table) => [uniqueIndex('user_profiles_user_unique').on(table.userId)],
)

export const userPermissions = mysqlTable(
  'user_permissions',
  {
    ...baseColumns(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    effect: mysqlEnum('effect', ['grant', 'revoke']).notNull(),
  },
  (table) => [
    uniqueIndex('user_permissions_user_permission_unique').on(table.userId, table.permissionId),
    index('user_permissions_permission_idx').on(table.permissionId, table.deletedAt),
  ],
)

export const permissionAuditLogs = mysqlTable(
  'permission_audit_logs',
  {
    ...baseColumns(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    targetType: mysqlEnum('target_type', ['role', 'user']).notNull(),
    targetId: varchar('target_id', { length: 100 }).notNull(),
    grants: json('grants').$type<string[]>().notNull(),
    revokes: json('revokes').$type<string[]>().notNull(),
  },
  (table) => [
    index('permission_audit_target_idx').on(table.targetType, table.targetId, table.createdAt),
    index('permission_audit_actor_idx').on(table.actorId, table.createdAt),
  ],
)

export const staffMembers = mysqlTable(
  'staff_members',
  {
    ...baseColumns(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    position: varchar('position', { length: 100 }),
    specialty: varchar('specialty', { length: 100 }),
    phone: varchar('phone', { length: 30 }),
    email: varchar('email', { length: 190 }),
    hiredAt: date('hired_at', { mode: 'date' }),
    googleCalendarId: varchar('google_calendar_id', { length: 255 }),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [
    uniqueIndex('staff_members_user_unique').on(table.userId),
    index('staff_members_name_idx').on(table.firstName, table.lastName),
    index('staff_members_active_idx').on(table.isActive, table.deletedAt),
  ],
)

export const patients = mysqlTable(
  'patients',
  {
    ...baseColumns(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    birthDate: date('birth_date', { mode: 'date' }),
    phone: varchar('phone', { length: 30 }),
    email: varchar('email', { length: 190 }),
    address: varchar('address', { length: 500 }),
    identification: varchar('identification', { length: 50 }),
    gender: varchar('gender', { length: 30 }),
  },
  (table) => [
    uniqueIndex('patients_identification_unique').on(table.identification),
    index('patients_name_idx').on(table.firstName, table.lastName),
    index('patients_email_idx').on(table.email),
    index('patients_deleted_idx').on(table.deletedAt),
  ],
)

export const emergencyContacts = mysqlTable(
  'emergency_contacts',
  {
    ...baseColumns(),
    patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    name: varchar('name', { length: 150 }).notNull(),
    relationship: varchar('relationship', { length: 80 }).notNull(),
    phone: varchar('phone', { length: 30 }).notNull(),
    email: varchar('email', { length: 190 }),
    address: varchar('address', { length: 500 }),
    isPrimary: boolean('is_primary').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [index('emergency_contacts_patient_idx').on(table.patientId, table.deletedAt)],
)

export const patientImages = mysqlTable(
  'patient_images',
  {
    ...baseColumns(),
    patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    contentType: varchar('content_type', { length: 127 }).notNull(),
    dataUrl: text('data_url').notNull(),
    sizeBytes: int('size_bytes').notNull(),
  },
  (table) => [index('patient_images_patient_idx').on(table.patientId, table.deletedAt)],
)

export const services = mysqlTable(
  'services',
  {
    ...baseColumns(),
    name: varchar('name', { length: 150 }).notNull(),
    description: text('description'),
    price: decimal('price', { precision: 12, scale: 2 }).notNull().default('0.00'),
  },
  (table) => [uniqueIndex('services_name_unique').on(table.name)],
)

export const paymentMethods = mysqlTable(
  'payment_methods',
  {
    ...baseColumns(),
    code: varchar('code', { length: 50 }).notNull(),
    description: varchar('description', { length: 100 }).notNull(),
  },
  (table) => [uniqueIndex('payment_methods_code_unique').on(table.code)],
)

export const insurers = mysqlTable(
  'insurers',
  {
    ...baseColumns(),
    name: varchar('name', { length: 150 }).notNull(),
    phone: varchar('phone', { length: 30 }),
    email: varchar('email', { length: 190 }),
    address: varchar('address', { length: 500 }),
    discountPercent: decimal('discount_percent', { precision: 5, scale: 2 }).notNull().default('0.00'),
  },
  (table) => [uniqueIndex('insurers_name_unique').on(table.name)],
)

export const promotions = mysqlTable(
  'promotions',
  {
    ...baseColumns(),
    code: varchar('code', { length: 50 }).notNull(),
    description: text('description'),
    discountPercent: decimal('discount_percent', { precision: 5, scale: 2 }).notNull(),
    startsAt: timestamp('starts_at', { mode: 'date' }),
    endsAt: timestamp('ends_at', { mode: 'date' }),
  },
  (table) => [
    uniqueIndex('promotions_code_unique').on(table.code),
    index('promotions_period_idx').on(table.startsAt, table.endsAt, table.deletedAt),
  ],
)

export const inventoryCategories = mysqlTable(
  'inventory_categories',
  {
    ...baseColumns(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
  },
  (table) => [uniqueIndex('inventory_categories_name_unique').on(table.name)],
)

export const suppliers = mysqlTable(
  'suppliers',
  {
    ...baseColumns(),
    name: varchar('name', { length: 150 }).notNull(),
    contactName: varchar('contact_name', { length: 150 }),
    phone: varchar('phone', { length: 30 }),
    email: varchar('email', { length: 190 }),
    address: varchar('address', { length: 500 }),
  },
  (table) => [index('suppliers_name_idx').on(table.name)],
)

export const products = mysqlTable(
  'products',
  {
    ...baseColumns(),
    categoryId: uuid('category_id').references(() => inventoryCategories.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    supplierId: uuid('supplier_id').references(() => suppliers.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    name: varchar('name', { length: 150 }).notNull(),
    description: text('description'),
    barcode: varchar('barcode', { length: 100 }),
    unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull().default('0.00'),
    minimumStock: int('minimum_stock').notNull().default(0),
  },
  (table) => [
    uniqueIndex('products_barcode_unique').on(table.barcode),
    index('products_name_idx').on(table.name, table.deletedAt),
    index('products_category_idx').on(table.categoryId, table.deletedAt),
  ],
)

export const inventoryLocations = mysqlTable(
  'inventory_locations',
  {
    ...baseColumns(),
    code: varchar('code', { length: 50 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
  },
  (table) => [
    uniqueIndex('inventory_locations_code_unique').on(table.code),
    uniqueIndex('inventory_locations_name_unique').on(table.name),
  ],
)

export const inventoryStock = mysqlTable(
  'inventory_stock',
  {
    ...baseColumns(),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    locationId: uuid('location_id').notNull().references(() => inventoryLocations.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    quantity: int('quantity').notNull().default(0),
  },
  (table) => [
    uniqueIndex('inventory_stock_product_location_unique').on(table.productId, table.locationId),
    index('inventory_stock_location_idx').on(table.locationId, table.deletedAt),
  ],
)

export const inventoryBatches = mysqlTable(
  'inventory_batches',
  {
    ...baseColumns(),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    locationId: uuid('location_id').references(() => inventoryLocations.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    batchNumber: varchar('batch_number', { length: 100 }).notNull(),
    quantity: int('quantity').notNull(),
    receivedAt: date('received_at', { mode: 'date' }).notNull(),
    expiresAt: date('expires_at', { mode: 'date' }),
    unitCost: decimal('unit_cost', { precision: 12, scale: 2 }),
  },
  (table) => [
    uniqueIndex('inventory_batches_product_number_unique').on(table.productId, table.batchNumber),
    index('inventory_batches_expiry_idx').on(table.expiresAt, table.deletedAt),
  ],
)

export const purchases = mysqlTable(
  'purchases',
  {
    ...baseColumns(),
    supplierId: uuid('supplier_id').references(() => suppliers.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    paymentMethodId: uuid('payment_method_id').references(() => paymentMethods.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    purchasedAt: timestamp('purchased_at', { mode: 'date' }).notNull(),
    totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
    notes: text('notes'),
  },
  (table) => [index('purchases_date_idx').on(table.purchasedAt, table.deletedAt)],
)

export const purchaseItems = mysqlTable(
  'purchase_items',
  {
    ...baseColumns(),
    purchaseId: uuid('purchase_id').notNull().references(() => purchases.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    batchId: uuid('batch_id').references(() => inventoryBatches.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    quantity: int('quantity').notNull(),
    unitCost: decimal('unit_cost', { precision: 12, scale: 2 }).notNull(),
  },
  (table) => [
    index('purchase_items_purchase_idx').on(table.purchaseId, table.deletedAt),
    index('purchase_items_product_idx').on(table.productId, table.deletedAt),
  ],
)

export const careEpisodes = mysqlTable(
  'care_episodes',
  {
    ...baseColumns(),
    patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    staffMemberId: uuid('staff_member_id').references(() => staffMembers.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    previousEpisodeId: uuid('previous_episode_id'),
    origin: varchar('origin', { length: 50 }),
    status: mysqlEnum('status', ['Pendiente', 'Pagado', 'Anulado']).notNull().default('Pendiente'),
    openedAt: timestamp('opened_at', { mode: 'date', fsp: 3 }).notNull(),
    closedAt: timestamp('closed_at', { mode: 'date', fsp: 3 }),
  },
  (table) => [
    index('care_episodes_patient_idx').on(table.patientId, table.openedAt, table.deletedAt),
    index('care_episodes_status_idx').on(table.status, table.deletedAt),
  ],
)

export const invoices = mysqlTable(
  'invoices',
  {
    ...baseColumns(),
    patientId: uuid('patient_id').references(() => patients.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    staffMemberId: uuid('staff_member_id').references(() => staffMembers.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    careEpisodeId: uuid('care_episode_id').references(() => careEpisodes.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    paymentMethodId: uuid('payment_method_id').references(() => paymentMethods.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    insurerId: uuid('insurer_id').references(() => insurers.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    promotionId: uuid('promotion_id').references(() => promotions.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    invoiceNumber: varchar('invoice_number', { length: 50 }).notNull(),
    issuedAt: timestamp('issued_at', { mode: 'date', fsp: 3 }).notNull(),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    status: mysqlEnum('status', ['Pendiente', 'Pagado', 'Anulado']).notNull().default('Pendiente'),
    elderlyDiscountPercent: decimal('elderly_discount_percent', { precision: 5, scale: 2 }).notNull().default('0.00'),
    promotionCode: varchar('promotion_code', { length: 50 }),
    promotionalDiscountPercent: decimal('promotional_discount_percent', { precision: 5, scale: 2 }).notNull().default('0.00'),
    taxRegistrationNumber: varchar('tax_registration_number', { length: 50 }),
    cai: varchar('cai', { length: 100 }),
  },
  (table) => [
    uniqueIndex('invoices_number_unique').on(table.invoiceNumber),
    uniqueIndex('invoices_care_episode_unique').on(table.careEpisodeId),
    index('invoices_patient_idx').on(table.patientId, table.issuedAt, table.deletedAt),
    index('invoices_status_idx').on(table.status, table.issuedAt, table.deletedAt),
  ],
)

export const invoiceItems = mysqlTable(
  'invoice_items',
  {
    ...baseColumns(),
    invoiceId: uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    serviceId: uuid('service_id').references(() => services.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    category: varchar('category', { length: 50 }).notNull(),
    description: varchar('description', { length: 255 }).notNull(),
    quantity: int('quantity').notNull().default(1),
    unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
    discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  },
  (table) => [
    index('invoice_items_invoice_idx').on(table.invoiceId, table.deletedAt),
    index('invoice_items_product_idx').on(table.productId, table.deletedAt),
    index('invoice_items_service_idx').on(table.serviceId, table.deletedAt),
  ],
)

export const billingLedgerEntries = mysqlTable(
  'billing_ledger_entries',
  {
    ...baseColumns(),
    patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    careEpisodeId: uuid('care_episode_id').references(() => careEpisodes.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    serviceId: uuid('service_id').references(() => services.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    movementId: uuid('movement_id'),
    station: varchar('station', { length: 50 }),
    category: varchar('category', { length: 50 }).notNull(),
    description: varchar('description', { length: 255 }).notNull(),
    quantity: int('quantity').notNull().default(1),
    unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
    totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
    occurredAt: timestamp('occurred_at', { mode: 'date', fsp: 3 }).notNull(),
    status: mysqlEnum('status', ['Pagado', 'Pendiente', 'Anulado']).notNull(),
    source: mysqlEnum('source', ['invoice', 'stock', 'manual', 'movement']).notNull(),
  },
  (table) => [
    index('billing_ledger_patient_idx').on(table.patientId, table.occurredAt, table.deletedAt),
    index('billing_ledger_invoice_idx').on(table.invoiceId, table.deletedAt),
    index('billing_ledger_episode_idx').on(table.careEpisodeId, table.deletedAt),
  ],
)

export const patientMovements = mysqlTable(
  'patient_movements',
  {
    ...baseColumns(),
    patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    careEpisodeId: uuid('care_episode_id').references(() => careEpisodes.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    fromStation: varchar('from_station', { length: 50 }),
    toStation: varchar('to_station', { length: 50 }).notNull(),
    occurredAt: timestamp('occurred_at', { mode: 'date', fsp: 3 }).notNull(),
    reason: varchar('reason', { length: 255 }),
    notes: text('notes'),
    source: mysqlEnum('source', ['visit', 'bed', 'oroom', 'manual']).notNull(),
    clinicalEncounterId: uuid('clinical_encounter_id'),
    bedId: uuid('bed_id'),
    operatingRoomId: uuid('operating_room_id'),
  },
  (table) => [
    index('patient_movements_patient_idx').on(table.patientId, table.occurredAt, table.deletedAt),
    index('patient_movements_episode_idx').on(table.careEpisodeId, table.occurredAt, table.deletedAt),
  ],
)

export const clinicalEncounters = mysqlTable(
  'clinical_encounters',
  {
    ...baseColumns(),
    patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    staffMemberId: uuid('staff_member_id').notNull().references(() => staffMembers.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    careEpisodeId: uuid('care_episode_id').references(() => careEpisodes.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    type: mysqlEnum('type', ['outpatient', 'emergency', 'hospitalization', 'operating_room']).notNull(),
    occurredAt: timestamp('occurred_at', { mode: 'date', fsp: 3 }).notNull(),
    lastVisitAt: timestamp('last_visit_at', { mode: 'date', fsp: 3 }),
    diagnosis: text('diagnosis'),
    treatment: text('treatment'),
    notes: text('notes'),
    familyHistory: text('family_history'),
    habitsHistory: text('habits_history'),
    pathologicalHistory: text('pathological_history'),
    surgicalHistory: text('surgical_history'),
  },
  (table) => [
    index('clinical_encounters_patient_idx').on(table.patientId, table.occurredAt, table.deletedAt),
    index('clinical_encounters_type_idx').on(table.type, table.occurredAt, table.deletedAt),
    index('clinical_encounters_invoice_idx').on(table.invoiceId, table.deletedAt),
  ],
)

export const encounterVitals = mysqlTable(
  'encounter_vitals',
  {
    ...baseColumns(),
    clinicalEncounterId: uuid('clinical_encounter_id').notNull().references(() => clinicalEncounters.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    bloodPressure: varchar('blood_pressure', { length: 20 }),
    oxygenSaturation: decimal('oxygen_saturation', { precision: 5, scale: 2 }),
    temperature: decimal('temperature', { precision: 5, scale: 2 }),
    bloodGlucose: decimal('blood_glucose', { precision: 6, scale: 2 }),
    weight: decimal('weight', { precision: 7, scale: 2 }),
    height: decimal('height', { precision: 6, scale: 2 }),
    bodyMassIndex: decimal('body_mass_index', { precision: 6, scale: 2 }),
    bodyFatPercent: decimal('body_fat_percent', { precision: 5, scale: 2 }),
    visceralFat: decimal('visceral_fat', { precision: 5, scale: 2 }),
    metabolicAge: int('metabolic_age'),
  },
  (table) => [uniqueIndex('encounter_vitals_encounter_unique').on(table.clinicalEncounterId)],
)

export const medicalRecords = mysqlTable(
  'medical_records',
  {
    ...baseColumns(),
    clinicalEncounterId: uuid('clinical_encounter_id').notNull().references(() => clinicalEncounters.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    chiefComplaint: text('chief_complaint').notNull(),
    currentIllness: text('current_illness').notNull(),
    physicalExam: text('physical_exam').notNull(),
    allergies: text('allergies'),
    currentMedications: text('current_medications'),
    followUpPlan: text('follow_up_plan'),
    referrals: text('referrals'),
    triageLevel: varchar('triage_level', { length: 50 }),
    arrivalMode: varchar('arrival_mode', { length: 100 }),
    painScale: int('pain_scale'),
    glasgowScore: int('glasgow_score'),
    disposition: varchar('disposition', { length: 100 }),
    injuryMechanism: text('injury_mechanism'),
    preoperativeDiagnosis: text('preoperative_diagnosis'),
    postoperativeDiagnosis: text('postoperative_diagnosis'),
    procedureName: text('procedure_name'),
    anesthesiaType: varchar('anesthesia_type', { length: 100 }),
    surgeryStartedAt: timestamp('surgery_started_at', { mode: 'date', fsp: 3 }),
    surgeryEndedAt: timestamp('surgery_ended_at', { mode: 'date', fsp: 3 }),
    findings: text('findings'),
    complications: text('complications'),
    admissionDiagnosis: text('admission_diagnosis'),
    admissionReason: text('admission_reason'),
    serviceName: varchar('service_name', { length: 150 }),
    bedLabel: varchar('bed_label', { length: 100 }),
    evolutionSummary: text('evolution_summary'),
    dischargePlan: text('discharge_plan'),
    dischargedAt: timestamp('discharged_at', { mode: 'date', fsp: 3 }),
  },
  (table) => [uniqueIndex('medical_records_encounter_unique').on(table.clinicalEncounterId)],
)

export const encounterProducts = mysqlTable(
  'encounter_products',
  {
    ...baseColumns(),
    clinicalEncounterId: uuid('clinical_encounter_id').notNull(),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    quantity: int('quantity').notNull(),
    notes: text('notes'),
  },
  (table) => [
    foreignKey({
      name: 'encounter_products_encounter_fk',
      columns: [table.clinicalEncounterId],
      foreignColumns: [clinicalEncounters.id],
    }).onDelete('cascade').onUpdate('cascade'),
    uniqueIndex('encounter_products_encounter_product_unique').on(table.clinicalEncounterId, table.productId),
    index('encounter_products_product_idx').on(table.productId, table.deletedAt),
  ],
)

export const encounterServices = mysqlTable(
  'encounter_services',
  {
    ...baseColumns(),
    clinicalEncounterId: uuid('clinical_encounter_id').notNull(),
    serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    quantity: int('quantity').notNull().default(1),
    notes: text('notes'),
  },
  (table) => [
    foreignKey({
      name: 'encounter_services_encounter_fk',
      columns: [table.clinicalEncounterId],
      foreignColumns: [clinicalEncounters.id],
    }).onDelete('cascade').onUpdate('cascade'),
    uniqueIndex('encounter_services_encounter_service_unique').on(table.clinicalEncounterId, table.serviceId),
    index('encounter_services_service_idx').on(table.serviceId, table.deletedAt),
  ],
)

export const stockMovements = mysqlTable(
  'stock_movements',
  {
    ...baseColumns(),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    fromLocationId: uuid('from_location_id').references(() => inventoryLocations.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    toLocationId: uuid('to_location_id').references(() => inventoryLocations.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    clinicalEncounterId: uuid('clinical_encounter_id').references(() => clinicalEncounters.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    purchaseItemId: uuid('purchase_item_id').references(() => purchaseItems.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    type: mysqlEnum('type', ['purchase', 'transfer', 'consumption', 'adjustment', 'return']).notNull(),
    quantity: int('quantity').notNull(),
    occurredAt: timestamp('occurred_at', { mode: 'date', fsp: 3 }).notNull(),
    notes: text('notes'),
  },
  (table) => [
    index('stock_movements_product_idx').on(table.productId, table.occurredAt, table.deletedAt),
    index('stock_movements_encounter_idx').on(table.clinicalEncounterId, table.deletedAt),
  ],
)

export const clinicalAttachments = mysqlTable(
  'clinical_attachments',
  {
    ...baseColumns(),
    patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    clinicalEncounterId: uuid('clinical_encounter_id'),
    label: varchar('label', { length: 255 }).notNull(),
    source: mysqlEnum('source', ['in_app_camera', 'file_upload']).notNull(),
    objectPath: varchar('object_path', { length: 512 }).notNull(),
    mimeType: varchar('mime_type', { length: 127 }).notNull(),
    sizeBytes: int('size_bytes').notNull(),
    uploadedBy: uuid('uploaded_by').notNull().references(() => users.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
  },
  (table) => [
    foreignKey({
      name: 'attachments_encounter_fk',
      columns: [table.clinicalEncounterId],
      foreignColumns: [clinicalEncounters.id],
    }).onDelete('set null').onUpdate('cascade'),
    index('clinical_attachments_patient_idx').on(table.patientId, table.deletedAt),
    index('clinical_attachments_encounter_idx').on(table.clinicalEncounterId, table.deletedAt),
  ],
)

export const clinicalAttachmentAccessLogs = mysqlTable(
  'attachment_access_logs',
  {
    ...baseColumns(),
    attachmentId: uuid('attachment_id').notNull().references(() => clinicalAttachments.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    accessedBy: uuid('accessed_by').references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    accessedAt: timestamp('accessed_at', { mode: 'date', fsp: 3 }).notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
  },
  (table) => [index('attachment_access_attachment_idx').on(table.attachmentId, table.accessedAt)],
)

export const appointmentTypes = mysqlTable(
  'appointment_types',
  {
    ...baseColumns(),
    code: varchar('code', { length: 50 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    color: varchar('color', { length: 10 }).notNull().default('#6B7280'),
  },
  (table) => [uniqueIndex('appointment_types_code_unique').on(table.code)],
)

export const appointmentStatuses = mysqlTable(
  'appointment_statuses',
  {
    ...baseColumns(),
    code: varchar('code', { length: 50 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
  },
  (table) => [uniqueIndex('appointment_statuses_code_unique').on(table.code)],
)

export const appointmentSources = mysqlTable(
  'appointment_sources',
  {
    ...baseColumns(),
    code: varchar('code', { length: 50 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
  },
  (table) => [uniqueIndex('appointment_sources_code_unique').on(table.code)],
)

export const beds = mysqlTable(
  'beds',
  {
    ...baseColumns(),
    code: varchar('code', { length: 50 }).notNull(),
    module: mysqlEnum('module', ['hospitalization', 'emergency']).notNull(),
    area: varchar('area', { length: 100 }),
    status: mysqlEnum('status', ['available', 'occupied', 'maintenance', 'blocked']).notNull().default('available'),
  },
  (table) => [
    uniqueIndex('beds_module_code_unique').on(table.module, table.code),
    index('beds_status_idx').on(table.module, table.status, table.deletedAt),
  ],
)

export const bedAssignments = mysqlTable(
  'bed_assignments',
  {
    ...baseColumns(),
    bedId: uuid('bed_id').notNull().references(() => beds.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    staffMemberId: uuid('staff_member_id').references(() => staffMembers.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    careEpisodeId: uuid('care_episode_id').references(() => careEpisodes.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    reason: varchar('reason', { length: 255 }),
    notes: text('notes'),
    expectedDischargeAt: timestamp('expected_discharge_at', { mode: 'date', fsp: 3 }),
    assignedAt: timestamp('assigned_at', { mode: 'date', fsp: 3 }).notNull(),
    releasedAt: timestamp('released_at', { mode: 'date', fsp: 3 }),
  },
  (table) => [
    index('bed_assignments_bed_idx').on(table.bedId, table.releasedAt, table.deletedAt),
    index('bed_assignments_patient_idx').on(table.patientId, table.assignedAt, table.deletedAt),
  ],
)

export const bedEvents = mysqlTable(
  'bed_events',
  {
    ...baseColumns(),
    bedId: uuid('bed_id').notNull().references(() => beds.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    assignmentId: uuid('assignment_id').references(() => bedAssignments.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    occurredAt: timestamp('occurred_at', { mode: 'date', fsp: 3 }).notNull(),
    details: json('details').$type<Record<string, unknown>>(),
  },
  (table) => [index('bed_events_bed_idx').on(table.bedId, table.occurredAt, table.deletedAt)],
)

export const operatingRooms = mysqlTable(
  'operating_rooms',
  {
    ...baseColumns(),
    code: varchar('code', { length: 50 }).notNull(),
    specialty: varchar('specialty', { length: 100 }),
    status: mysqlEnum('status', ['available', 'occupied', 'maintenance', 'blocked']).notNull().default('available'),
  },
  (table) => [
    uniqueIndex('operating_rooms_code_unique').on(table.code),
    index('operating_rooms_status_idx').on(table.status, table.deletedAt),
  ],
)

export const operatingRoomAssignments = mysqlTable(
  'operating_room_assignments',
  {
    ...baseColumns(),
    operatingRoomId: uuid('operating_room_id').notNull(),
    patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    staffMemberId: uuid('staff_member_id').references(() => staffMembers.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    careEpisodeId: uuid('care_episode_id').references(() => careEpisodes.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    procedureName: varchar('procedure_name', { length: 255 }),
    anesthesiaType: varchar('anesthesia_type', { length: 100 }),
    scheduledStartAt: timestamp('scheduled_start_at', { mode: 'date', fsp: 3 }),
    scheduledEndAt: timestamp('scheduled_end_at', { mode: 'date', fsp: 3 }),
    notes: text('notes'),
    assignedAt: timestamp('assigned_at', { mode: 'date', fsp: 3 }).notNull(),
    releasedAt: timestamp('released_at', { mode: 'date', fsp: 3 }),
  },
  (table) => [
    foreignKey({
      name: 'or_assignments_room_fk',
      columns: [table.operatingRoomId],
      foreignColumns: [operatingRooms.id],
    }).onDelete('restrict').onUpdate('cascade'),
    index('or_assignments_room_idx').on(table.operatingRoomId, table.releasedAt, table.deletedAt),
    index('or_assignments_patient_idx').on(table.patientId, table.assignedAt, table.deletedAt),
  ],
)

export const operatingRoomEvents = mysqlTable(
  'operating_room_events',
  {
    ...baseColumns(),
    operatingRoomId: uuid('operating_room_id').notNull().references(() => operatingRooms.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    assignmentId: uuid('assignment_id'),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    occurredAt: timestamp('occurred_at', { mode: 'date', fsp: 3 }).notNull(),
    details: json('details').$type<Record<string, unknown>>(),
  },
  (table) => [
    foreignKey({
      name: 'or_events_assignment_fk',
      columns: [table.assignmentId],
      foreignColumns: [operatingRoomAssignments.id],
    }).onDelete('set null').onUpdate('cascade'),
    index('or_events_room_idx').on(table.operatingRoomId, table.occurredAt, table.deletedAt),
  ],
)

export const appointments = mysqlTable(
  'appointments',
  {
    ...baseColumns(),
    typeId: uuid('type_id').notNull().references(() => appointmentTypes.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    statusId: uuid('status_id').notNull().references(() => appointmentStatuses.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    sourceId: uuid('source_id').notNull().references(() => appointmentSources.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    staffMemberId: uuid('staff_member_id').references(() => staffMembers.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    patientId: uuid('patient_id').references(() => patients.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    bedId: uuid('bed_id').references(() => beds.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    operatingRoomId: uuid('operating_room_id').references(() => operatingRooms.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    startsAt: timestamp('starts_at', { mode: 'date', fsp: 3 }).notNull(),
    endsAt: timestamp('ends_at', { mode: 'date', fsp: 3 }).notNull(),
    patientName: varchar('patient_name', { length: 200 }),
    externalId: varchar('external_id', { length: 255 }),
    chatbotSessionId: varchar('chatbot_session_id', { length: 255 }),
    notes: text('notes'),
    googleCalendarEventId: varchar('google_calendar_event_id', { length: 255 }),
    googleCalendarSyncedAt: timestamp('google_calendar_synced_at', { mode: 'date', fsp: 3 }),
  },
  (table) => [
    index('appointments_period_idx').on(table.startsAt, table.endsAt, table.deletedAt),
    index('appointments_staff_period_idx').on(table.staffMemberId, table.startsAt, table.endsAt, table.deletedAt),
    index('appointments_patient_idx').on(table.patientId, table.startsAt, table.deletedAt),
    uniqueIndex('appointments_google_event_unique').on(table.googleCalendarEventId),
  ],
)

export type Role = typeof roles.$inferSelect
export type User = typeof users.$inferSelect
export type Patient = typeof patients.$inferSelect
export type StaffMember = typeof staffMembers.$inferSelect
export type ClinicalEncounter = typeof clinicalEncounters.$inferSelect
export type Invoice = typeof invoices.$inferSelect
export type Product = typeof products.$inferSelect
export type Appointment = typeof appointments.$inferSelect
