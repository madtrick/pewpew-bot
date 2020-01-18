import { Request } from './requests'

export interface Position {
  x: number
  y: number
}

export type Rotation = number

export interface BotAPI<S> {
  handlers: {
    radarScanNotification?: (
      scan: {
        players: { position: Position }[],
        shots: { position: Position }[],
        unknown: { position: Position }[]
        // TODO include mines
      },
      state: S
    ) => { state: S, requests: Request[] }

    registerPlayerResponse?: (
      data: SuccessfulRegisterPlayerResponse | FailedRegisterPlayerResponse,
      state: S
    ) => { state: S, requests: Request[] }

    rotatePlayerResponse?: (
      data: SuccessfulRotatePlayerResponse | FailedRotatePlayerResponse,
      state: S
    ) => { state: S, requests: Request[] }

    movePlayerResponse?: (
      data: SuccessfulMovePlayerResponse | FailedMovePlayerResponse,
      state: S
    ) => { state: S, requests: Request[] }

    shootResponse?: (
      data: SuccessfulShootResponse | FailedShootResponse,
      state: S
    ) => { state: S, requests: Request[] }

    shotHitNotification?: (
      data: PlayerShotHitNotification,
      state: S
    ) => { state: S, requests: Request[] }

    // TODO include handler for destroyed player

    startGameNotification?: (state: S) => { state: S, requests: Request[] }

    joinGameNotification?: (state: S) => { state: S, requests: Request[] }
  }
}

export interface SuccessfulRegisterPlayerResponse {
  success: true
  data: {
    id: string
    position: Position
    rotation: Rotation
  }
}

export interface FailedRegisterPlayerResponse {
  success: false
  data: string
}

export interface SuccessfulMovePlayerResponse {
  success: false
  data: string
}

export interface FailedMovePlayerResponse {
  success: true
  data: {
    position: Position
  }
}

export interface SuccessfulRotatePlayerResponse {
  success: true
}

export interface FailedRotatePlayerResponse {
  success: false
}

export interface SuccessfulShootResponse {
  success: true
}

export interface FailedShootResponse {
  success: false
}

export interface PlayerShotHitNotification {
  damage: number
}
