import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  LoginUseCase,
  RefreshTokenUseCase,
  RegisterUserUseCase,
} from '../../application/use-cases';
import { CurrentUser } from '../../common/decorators';
import { AuthenticatedUser } from '../auth/authenticated-user';
import {
  LoginRequestDto,
  RefreshTokenRequestDto,
  RegisterRequestDto,
} from '../dtos';
import { JwtAuthGuard } from '../guards';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
  ) {}

  /** Register a buyer account and return an auth token pair. */
  @Post('register')
  @ApiOperation({ summary: 'Register buyer account' })
  @ApiResponse({ status: 201, description: 'User registered.' })
  async register(@Body() body: RegisterRequestDto) {
    return this.registerUserUseCase.execute(body);
  }

  /** Login with email and password and return an auth token pair. */
  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 201, description: 'User authenticated.' })
  async login(@Body() body: LoginRequestDto) {
    return this.loginUseCase.execute(body);
  }

  /** Refresh an access token using a valid refresh token. */
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh token pair' })
  @ApiResponse({ status: 201, description: 'Token pair refreshed.' })
  async refresh(@Body() body: RefreshTokenRequestDto) {
    return this.refreshTokenUseCase.execute(body);
  }

  /** Return the current authenticated user from a bearer token. */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Authenticated profile.' })
  getProfile(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }
}
