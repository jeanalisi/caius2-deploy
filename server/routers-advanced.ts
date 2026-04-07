import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createAttachment,
  createAttachmentConfig,
  createFormField,
  createFormTemplate,
  createServiceType,
  createUserRegistration,
  deleteAttachmentConfig,
  deleteContextHelp,
  deleteFormField,
  deleteFormTemplate,
  deleteServiceType,
  duplicateServiceType,
  getNextAvailableCode,
  getActiveSessions,
  getAttachmentConfigs,
  getAttachments,
  getAttachmentsByNup,
  getContextHelp,
  getFormFields,
  getFormTemplateById,
  getFormTemplates,
  getInstitutionalConfig,
  getServiceTypeById,
  getServiceTypes,
  getUserRegistrationByEmail,
  globalSearch,
  listContextHelp,
  reorderFormFields,
  setInstitutionalConfigs,
  softDeleteAttachment,
  terminateSessionById,
  updateFormField,
  updateFormTemplate,
  updateServiceType,
  upsertContextHelp,
  upsertSearchIndex,
} from "./db-advanced";
import {
  createServiceTypeField,
  createServiceTypeDocument,
  createServiceSubject,
  deleteServiceTypeField,
  deleteServiceTypeDocument,
  deleteServiceSubject,
  getCidadaoServiceDetail,
  getCidadaoServices,
  getServiceSubjectById,
  getServiceSubjects,
  getServiceTypeDocuments,
  getServiceTypeFields,
  publishServiceType,
  reorderServiceTypeFields,
  updateServiceTypeDocument,
  updateServiceTypeField,
  updateServiceSubject,
} from "./db-service-config";
import { storagePut } from "./storage";
import { createProtocol } from "./db-caius";
import { nanoid } from "nanoid";

// ─── Service Types Router ──────────────────────────────────────────────────────
export const serviceTypesRouter = router({
  list: protectedProcedure
    .input(z.object({ isActive: z.boolean().optional(), category: z.string().optional() }).optional())
    .query(({ input }) => getServiceTypes(input)),

  listPublic: publicProcedure
    .query(() => getServiceTypes({ isActive: true })),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const st = await getServiceTypeById(input.id);
      if (!st) throw new TRPCError({ code: "NOT_FOUND" });
      return st;
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(2),
      description: z.string().optional(),
      category: z.string().optional(),
      code: z.string().optional(),
      initialSectorId: z.number().optional(),
      slaResponseHours: z.number().optional(),
      slaConclusionHours: z.number().optional(),
      secrecyLevel: z.enum(["public", "restricted", "confidential", "secret"]).default("public"),
      requiresApproval: z.boolean().default(false),
      canConvertToProcess: z.boolean().default(false),
      allowPublicConsult: z.boolean().default(true),
      requiresSelfie: z.boolean().default(false),
      requiresGeolocation: z.boolean().default(false),
      requiresStrongAuth: z.boolean().default(false),
      allowedProfiles: z.array(z.string()).optional(),
      flowConfig: z.any().optional(),
      serviceMode: z.enum(["form", "external"]).default("form"),
      externalUrl: z.string().optional(),
    }))
    .mutation(({ input, ctx }) => createServiceType({ ...input, createdById: ctx.user.id })),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(2).optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      slaResponseHours: z.number().optional(),
      slaConclusionHours: z.number().optional(),
      secrecyLevel: z.enum(["public", "restricted", "confidential", "secret"]).optional(),
      requiresApproval: z.boolean().optional(),
      requiresSelfie: z.boolean().optional(),
      requiresGeolocation: z.boolean().optional(),
      allowPublicConsult: z.boolean().optional(),
      isActive: z.boolean().optional(),
      allowedProfiles: z.array(z.string()).optional(),
      flowConfig: z.any().optional(),
      serviceMode: z.enum(["form", "external"]).optional(),
      externalUrl: z.string().optional().nullable(),
    }))
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return updateServiceType(id, data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteServiceType(input.id)),

  duplicate: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(2),
      code: z.string().optional().nullable(),
    }))
    .mutation(({ input, ctx }) =>
      duplicateServiceType(input.id, { name: input.name, code: input.code }, ctx.user.id)
    ),

  nextCode: protectedProcedure
    .input(z.object({ baseCode: z.string() }))
    .query(({ input }) => getNextAvailableCode(input.baseCode).then(code => ({ code }))),
});

// ─── Form Templates Router ─────────────────────────────────────────────────────
export const formTemplatesRouter = router({
  list: protectedProcedure
    .input(z.object({ serviceTypeId: z.number().optional() }).optional())
    .query(({ input }) => getFormTemplates(input?.serviceTypeId)),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const tmpl = await getFormTemplateById(input.id);
      if (!tmpl) throw new TRPCError({ code: "NOT_FOUND" });
      const fields = await getFormFields(input.id);
      return { ...tmpl, fields };
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(2),
      description: z.string().optional(),
      serviceTypeId: z.number().optional(),
    }))
    .mutation(({ input, ctx }) => createFormTemplate({ ...input, createdById: ctx.user.id })),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return updateFormTemplate(id, data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteFormTemplate(input.id)),

  // Form Fields
  addField: protectedProcedure
    .input(z.object({
      formTemplateId: z.number(),
      name: z.string(),
      label: z.string(),
      fieldType: z.enum([
        "text", "textarea", "number", "currency", "cpf", "cnpj", "rg", "matricula",
        "email", "phone", "date", "time", "datetime", "address", "cep", "neighborhood",
        "city", "state", "select", "multiselect", "checkbox", "radio", "dependent_list",
        "file_upload", "image", "selfie", "geolocation", "map", "calculated", "hidden",
        "signature", "acknowledgment"
      ]),
      placeholder: z.string().optional(),
      helpText: z.string().optional(),
      isRequired: z.boolean().default(false),
      defaultValue: z.string().optional(),
      mask: z.string().optional(),
      maxLength: z.number().optional(),
      options: z.any().optional(),
      conditionalRule: z.any().optional(),
      sectionName: z.string().optional(),
      displayOrder: z.number().default(0),
      dependsOnFieldId: z.number().optional(),
      autoFill: z.string().optional(),
    }))
    .mutation(({ input }) => createFormField(input)),

  updateField: protectedProcedure
    .input(z.object({
      id: z.number(),
      label: z.string().optional(),
      placeholder: z.string().optional(),
      helpText: z.string().optional(),
      isRequired: z.boolean().optional(),
      defaultValue: z.string().optional(),
      options: z.any().optional(),
      conditionalRule: z.any().optional(),
      displayOrder: z.number().optional(),
      isReadOnly: z.boolean().optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return updateFormField(id, data);
    }),

  deleteField: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteFormField(input.id)),

  reorderFields: protectedProcedure
    .input(z.array(z.object({ id: z.number(), displayOrder: z.number() })))
    .mutation(({ input }) => reorderFormFields(input)),
});

// ─── Attachments Router ────────────────────────────────────────────────────────
export const attachmentsRouter = router({
  getByEntity: protectedProcedure
    .input(z.object({ entityType: z.string(), entityId: z.number() }))
    .query(({ input }) => getAttachments(input.entityType, input.entityId)),

  getByNup: protectedProcedure
    .input(z.object({ nup: z.string() }))
    .query(({ input }) => getAttachmentsByNup(input.nup)),

  upload: protectedProcedure
    .input(z.object({
      entityType: z.string(),
      entityId: z.number(),
      nup: z.string().optional(),
      fileName: z.string(),
      mimeType: z.string(),
      base64Data: z.string(),
      category: z.string().optional(),
      configId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const buffer = Buffer.from(input.base64Data, "base64");
      const suffix = nanoid(8);
      const fileKey = `attachments/${input.entityType}/${input.entityId}/${suffix}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      return createAttachment({
        entityType: input.entityType,
        entityId: input.entityId,
        nup: input.nup,
        uploadedById: ctx.user.id,
        fileName: fileKey,
        originalName: input.fileName,
        mimeType: input.mimeType,
        fileSizeBytes: buffer.byteLength,
        s3Key: fileKey,
        s3Url: url,
        category: input.category,
        configId: input.configId,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input, ctx }) => softDeleteAttachment(input.id, ctx.user.id)),

  // Attachment Configs
  listConfigs: protectedProcedure
    .input(z.object({ serviceTypeId: z.number().optional() }).optional())
    .query(({ input }) => getAttachmentConfigs(input?.serviceTypeId)),

  createConfig: protectedProcedure
    .input(z.object({
      serviceTypeId: z.number().optional(),
      formTemplateId: z.number().optional(),
      name: z.string().min(2),
      description: z.string().optional(),
      acceptedTypes: z.array(z.string()).optional(),
      maxFileSizeMb: z.number().default(10),
      maxTotalSizeMb: z.number().default(50),
      minCount: z.number().default(0),
      maxCount: z.number().default(10),
      isRequired: z.boolean().default(false),
      allowedAtStages: z.array(z.string()).optional(),
    }))
    .mutation(({ input }) => createAttachmentConfig(input)),

  deleteConfig: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteAttachmentConfig(input.id)),
});

// ─── Context Help Router ───────────────────────────────────────────────────────
export const contextHelpRouter = router({
  get: publicProcedure
    .input(z.object({ featureKey: z.string() }))
    .query(({ input }) => getContextHelp(input.featureKey)),

  list: protectedProcedure
    .query(() => listContextHelp()),

  upsert: protectedProcedure
    .input(z.object({
      featureKey: z.string(),
      title: z.string(),
      description: z.string().optional(),
      detailedInstructions: z.string().optional(),
      examples: z.string().optional(),
      requiredDocuments: z.string().optional(),
      warnings: z.string().optional(),
      normativeBase: z.string().optional(),
      usefulLinks: z.array(z.object({ label: z.string(), url: z.string() })).optional(),
      targetProfiles: z.array(z.string()).optional(),
      displayMode: z.enum(["tooltip", "modal", "sidebar", "expandable"]).default("modal"),
      isActive: z.boolean().default(true),
    }))
    .mutation(({ input, ctx }) => {
      const { featureKey, ...data } = input;
      return upsertContextHelp(featureKey, { ...data, createdById: ctx.user.id });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteContextHelp(input.id)),
});

// ─── Online Sessions Router ────────────────────────────────────────────────────
export const onlineSessionsRouter = router({
  getActive: protectedProcedure
    .query(() => getActiveSessions()),

  terminate: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(({ input, ctx }) => terminateSessionById(input.sessionId, ctx.user.id)),
});

// ─── Institutional Config Router ───────────────────────────────────────────────
export const institutionalConfigRouter = router({
  get: publicProcedure
    .query(() => getInstitutionalConfig()),

  save: protectedProcedure
    .input(z.array(z.object({
      key: z.string(),
      value: z.string(),
      label: z.string().optional(),
      type: z.string().optional(),
      description: z.string().optional(),
    })))
    .mutation(({ input, ctx }) => setInstitutionalConfigs(input, ctx.user.id)),
});

// ─── Global Search Router ──────────────────────────────────────────────────────
export const globalSearchRouter = router({
  search: protectedProcedure
    .input(z.object({ query: z.string().min(2), limit: z.number().default(20) }))
    .query(({ input }) => globalSearch(input.query, false, input.limit)),

  searchPublic: publicProcedure
    .input(z.object({ query: z.string().min(2), limit: z.number().default(20) }))
    .query(({ input }) => globalSearch(input.query, true, input.limit)),

  index: protectedProcedure
    .input(z.object({
      entityType: z.string(),
      entityId: z.number(),
      nup: z.string().optional(),
      title: z.string(),
      content: z.string().optional(),
      tags: z.array(z.string()).optional(),
      isPublic: z.boolean().default(false),
    }))
    .mutation(({ input }) => upsertSearchIndex(input.entityType, input.entityId, input)),
});

// ─── Service Type Fields Router ────────────────────────────────────────────────
export const serviceTypeFieldsRouter = router({
  list: protectedProcedure
    .input(z.object({ serviceTypeId: z.number() }))
    .query(({ input }) => getServiceTypeFields(input.serviceTypeId)),

  create: protectedProcedure
    .input(z.object({
      serviceTypeId: z.number(),
      name: z.string().min(1),
      label: z.string().min(1),
      fieldType: z.enum(["text","textarea","number","email","phone","cpf","cnpj","date","datetime","select","multiselect","checkbox","radio","file","image","signature","geolocation"]).default("text"),
      requirement: z.enum(["required","complementary","optional"]).default("optional"),
      placeholder: z.string().optional(),
      helpText: z.string().optional(),
      options: z.string().optional(),
      mask: z.string().optional(),
      sortOrder: z.number().default(0),
    }))
    .mutation(({ input }) => createServiceTypeField(input)),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      label: z.string().optional(),
      fieldType: z.enum(["text","textarea","number","email","phone","cpf","cnpj","date","datetime","select","multiselect","checkbox","radio","file","image","signature","geolocation"]).optional(),
      requirement: z.enum(["required","complementary","optional"]).optional(),
      placeholder: z.string().optional(),
      helpText: z.string().optional(),
      options: z.string().optional(),
      mask: z.string().optional(),
      sortOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(({ input }) => { const { id, ...data } = input; return updateServiceTypeField(id, data); }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteServiceTypeField(input.id)),

  reorder: protectedProcedure
    .input(z.object({ items: z.array(z.object({ id: z.number(), sortOrder: z.number() })) }))
    .mutation(({ input }) => reorderServiceTypeFields(input.items)),
});

// ─── Service Type Documents Router ────────────────────────────────────────────
export const serviceTypeDocumentsRouter = router({
  list: protectedProcedure
    .input(z.object({ serviceTypeId: z.number() }))
    .query(({ input }) => getServiceTypeDocuments(input.serviceTypeId)),

  listPublic: publicProcedure
    .input(z.object({ serviceTypeId: z.number() }))
    .query(({ input }) => getServiceTypeDocuments(input.serviceTypeId)),

  create: protectedProcedure
    .input(z.object({
      serviceTypeId: z.number(),
      name: z.string().min(1),
      description: z.string().optional(),
      requirement: z.enum(["required","complementary","optional"]).default("required"),
      acceptedFormats: z.string().default("pdf,jpg,png"),
      maxSizeMb: z.number().default(10),
      example: z.string().optional(),
      sortOrder: z.number().default(0),
    }))
    .mutation(({ input }) => createServiceTypeDocument(input)),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      requirement: z.enum(["required","complementary","optional"]).optional(),
      acceptedFormats: z.string().optional(),
      maxSizeMb: z.number().optional(),
      sortOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(({ input }) => { const { id, ...data } = input; return updateServiceTypeDocument(id, data); }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteServiceTypeDocument(input.id)),
});

// ─── Service Subjects Router ──────────────────────────────────────────────────
export const serviceSubjectsRouter = router({
  list: protectedProcedure
    .input(z.object({ serviceTypeId: z.number() }))
    .query(({ input }) => getServiceSubjects(input.serviceTypeId)),

  listPublic: publicProcedure
    .input(z.object({ serviceTypeId: z.number() }))
    .query(({ input }) => getServiceSubjects(input.serviceTypeId, true)),

  create: protectedProcedure
    .input(z.object({
      serviceTypeId: z.number(),
      name: z.string().min(2),
      description: z.string().optional(),
      code: z.string().optional(),
      isPublic: z.boolean().default(true),
      formTemplateId: z.number().optional(),
      slaResponseHours: z.number().optional(),
      slaConclusionHours: z.number().optional(),
      responsibleSectorId: z.number().optional(),
      importantNotes: z.string().optional(),
      sortOrder: z.number().default(0),
    }))
    .mutation(({ input }) => createServiceSubject(input)),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      isPublic: z.boolean().optional(),
      isActive: z.boolean().optional(),
      formTemplateId: z.number().optional(),
      slaResponseHours: z.number().optional(),
      slaConclusionHours: z.number().optional(),
      responsibleSectorId: z.number().optional(),
      importantNotes: z.string().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(({ input }) => { const { id, ...data } = input; return updateServiceSubject(id, data); }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteServiceSubject(input.id)),
});

// ─── Cidadão (Public Citizen Portal) Router ────────────────────────────────────
export const cidadaoRouter = router({
  listServices: publicProcedure
    .input(z.object({ search: z.string().optional(), category: z.string().optional() }).optional())
    .query(({ input }) => getCidadaoServices(input)),

  getService: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const service = await getCidadaoServiceDetail(input.id);
      if (!service) throw new TRPCError({ code: "NOT_FOUND" });
      return service;
    }),

  publish: protectedProcedure
    .input(z.object({ id: z.number(), isPublic: z.boolean() }))
    .mutation(({ input }) => publishServiceType(input.id, input.isPublic)),

  getSubjects: publicProcedure
    .input(z.object({ serviceTypeId: z.number() }))
    .query(({ input }) => getServiceSubjects(input.serviceTypeId, true)),

  submitRequest: publicProcedure
    .input(z.object({
      serviceTypeId: z.number().optional(),
      subjectId: z.number().optional(),
      subject: z.string().min(3),
      description: z.string().min(10),
      type: z.enum(["request", "complaint", "information", "suggestion", "praise", "ombudsman", "esic", "administrative"]).default("request"),
      requesterName: z.string().min(2),
      requesterEmail: z.string().email().optional(),
      requesterPhone: z.string().optional(),
      requesterCpfCnpj: z.string().optional(),
      isConfidential: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const result = await createProtocol({
        subject: input.subject,
        description: input.description,
        type: input.type,
        channel: "web",
        status: "open",
        priority: "normal",
        requesterName: input.requesterName,
        requesterEmail: input.requesterEmail,
        requesterPhone: input.requesterPhone,
        requesterCpfCnpj: input.requesterCpfCnpj,
        isConfidential: input.isConfidential,
      });
      // createProtocol returns { nup, protocolId } — extract just the nup string
      const nup = typeof result === "string" ? result : result.nup;
      return { nup, success: true };
    }),
});

// ─── User Registration Router ──────────────────────────────────────────────────
export const userRegistrationRouter = router({
  checkEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const reg = await getUserRegistrationByEmail(input.email);
      return { exists: !!reg, verified: reg?.emailVerified ?? false };
    }),

  register: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(2),
      cpf: z.string().optional(),
      phone: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const existing = await getUserRegistrationByEmail(input.email);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "E-mail já cadastrado" });
      // In a real implementation, hash the password with bcrypt
      // For now, we store a placeholder and note this needs bcrypt
      const verifyToken = nanoid(32);
      await createUserRegistration({
        email: input.email,
        passwordHash: `hash:${input.password}`, // TODO: use bcrypt in production
        emailVerifyToken: verifyToken,
        emailVerified: false,
      });
      return { success: true, message: "Cadastro realizado. Verifique seu e-mail para ativar a conta." };
    }),
});
