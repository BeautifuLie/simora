import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('@/../../wailsjs/go/service/OrganizationService', () => ({
    LoadOrganizations: vi.fn().mockResolvedValue([]),
    CreateOrganization: vi.fn().mockResolvedValue(undefined),
    RenameOrganization: vi.fn().mockResolvedValue(undefined),
    DeleteOrganization: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/../../wailsjs/go/service/RequestService', () => ({
    ExecuteRequest: vi.fn().mockResolvedValue({ status: 200, body: '', headers: {}, time: 0 }),
    ClearCookies: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/../../wailsjs/go/service/SettingsService', () => ({
    Load: vi.fn().mockResolvedValue({}),
    Save: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/../../wailsjs/go/service/KafkaService', () => ({
    Produce: vi.fn().mockResolvedValue(''),
    Consume: vi.fn().mockResolvedValue(''),
}));

vi.mock('@/../../wailsjs/go/service/SqsService', () => ({
    SendMessage: vi.fn().mockResolvedValue(''),
}));

vi.mock('@/../../wailsjs/go/service/GrpcService', () => ({
    Invoke: vi.fn().mockResolvedValue(''),
    ListMethods: vi.fn().mockResolvedValue([]),
    ListServices: vi.fn().mockResolvedValue([]),
}));
