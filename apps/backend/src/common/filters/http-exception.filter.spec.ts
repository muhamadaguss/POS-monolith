import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { GlobalExceptionFilter } from './http-exception.filter';

jest.mock('@sentry/node', () => ({ captureException: jest.fn() }));

/** Bangun ArgumentsHost palsu yang menangkap response.status().json(). */
function mockHost(): {
  host: ArgumentsHost;
  json: jest.Mock;
  status: jest.Mock;
} {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url: '/api/v1/test' }),
    }),
  } as unknown as ArgumentsHost;
  return { host, json, status };
}

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    jest.clearAllMocks();
  });

  it('TIDAK melapor ke Sentry untuk HttpException 4xx (validasi/auth)', () => {
    const { host, status } = mockHost();
    filter.catch(new BadRequestException('input tidak valid'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('TIDAK melapor ke Sentry untuk HttpException lain (mis. 500 eksplisit terkontrol)', () => {
    const { host } = mockHost();
    filter.catch(
      new HttpException('terkontrol', HttpStatus.INTERNAL_SERVER_ERROR),
      host,
    );
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('melapor ke Sentry untuk error tak-terduga (non-HttpException → 500)', () => {
    const { host, status } = mockHost();
    const boom = new Error('boom');
    filter.catch(boom, host);
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(Sentry.captureException).toHaveBeenCalledWith(boom);
  });
});
