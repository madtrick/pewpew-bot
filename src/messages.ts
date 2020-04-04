import { Rotation, Position } from './types'
import { MovementDirection } from './requests'

export enum MessageTypes {
  Request = 'Request',
  Response = 'Response',
  Notification = 'Notification'
}

export enum RequestTypes {
  RegisterPlayer = 'RegisterPlayer',
  MovePlayer = 'MovePlayer',
  RotatePlayer = 'RotatePlayer',
  Shoot = 'Shoot',
  DeployMine = 'DeployMine'
}

export enum ResponseTypes {
  RegisterPlayer = 'RegisterPlayer',
  MovePlayer = 'MovePlayer',
  RotatePlayer = 'RotatePlayer',
  Shoot = 'Shoot',
  DeployMine = 'DeployMine'
}

export enum NotificationTypes {
  RadarScan = 'RadarScan',
  StartGame = 'StartGame',
  JoinGame = 'JoinGame',
  Hit = 'Hit'
}

export interface RegisterPlayerRequestMessage {
  type: MessageTypes.Request
  id: RequestTypes.RegisterPlayer
  data: {
    game: {
      version: string
    }
    id: string
  }
}

export interface RegisterPlayerResponseMessage {
  type: MessageTypes.Response
  id: ResponseTypes.RegisterPlayer
  success: boolean
  details?: {
    id: string
    position: Position
    rotation: Rotation
  }
}

export interface MovePlayerRequestMessage {
  type: MessageTypes.Request
  id: RequestTypes.MovePlayer
  data: {
    movement: {
      direction: MovementDirection
      withTurbo?: boolean
    }
  }
}

export interface RotatePlayerRequestMessage {
  type: MessageTypes.Request
  id: RequestTypes.RotatePlayer
  data: {
    rotation: Rotation
  }
}

export interface MovePlayerResponseMessage {
  type: MessageTypes.Response
  id: ResponseTypes.MovePlayer
  success: boolean
  // details are only present if `success` === true
  data?: {
    component: {
      details: {
        position: Position
        tokens: number
      }
    }
    request: {
      withTurbo: boolean
      cost: number
    }
  }
}

export interface RotatePlayerResponseMessage {
  type: MessageTypes.Response
  id: 'RotatePlayer'
  success: boolean
  // 'data' is only present if the rotation was successful
  data?: {
    component: {
      details: {
        rotation: number
        tokens: number
      }
    }
    request: {
      cost: number
    }
  }
}

export interface PlayerHitNotificationMessage {
  type: MessageTypes.Notification
  id: NotificationTypes.Hit
  data: {
    damage: number
  }
}

export interface RadarScanNotificationMessage {
  type: MessageTypes.Notification
  id: NotificationTypes.RadarScan
  data: {
    players: { position: Position, id: string, rotation: Rotation }[]
    unknown: { position: Position }[]
    mines: { position: Position }[]
    shots: { position: Position, rotation: Rotation }[]
  }
}

export interface ShootRequestMessage {
  type: MessageTypes.Request
  id: RequestTypes.Shoot
}

export interface ShootResponseMessage {
  type: MessageTypes.Response
  id: ResponseTypes.Shoot
  success: boolean
  // 'data' is only present if the request was successful
  data?: {
    component: {
      details: {
        tokens: number
      }
    }
    request: {
      cost: number
    }
  }
}

export interface DeployMineRequestMessage {
  type: MessageTypes.Request
  id: RequestTypes.DeployMine
}

export interface DeployMineResponseMessage {
  type: MessageTypes.Response
  id: ResponseTypes.Shoot
  success: boolean
  data: {
    component: {
      details: {
        tokens: number
      }
    }
    request: {
      cost: number
    }
  }
}

export interface StartGameNofiticationMessage {
  type: MessageTypes.Notification
  id: NotificationTypes.StartGame
}

export interface JoinGameNotificationMessage {
  type: MessageTypes.Notification
  id: NotificationTypes.JoinGame
}

export interface RadarScan {
  players: { position: Position }[]
  unknown: { position: Position }[]
}

export function isRegisterPlayerResponseMessage (message: any): message is RegisterPlayerResponseMessage {
  const { type, id } = message

  return type === MessageTypes.Response && id === ResponseTypes.RegisterPlayer
}

export function isMovePlayerResponseMessage (message: any): message is MovePlayerResponseMessage {
  const { type, id } = message

  return type === MessageTypes.Response && id === ResponseTypes.MovePlayer
}

export function isRotatePlayerResponseMessage (message: any): message is RotatePlayerResponseMessage {
  const { type, id } = message

  return type === MessageTypes.Response && id === 'RotatePlayer'
}

export function isRadarScanNotificationMessage (message: any): message is RadarScanNotificationMessage {
  const { type, id } = message

  return type === MessageTypes.Notification && id === NotificationTypes.RadarScan
}

export function isStartGameNotificationMessage (message: any): message is StartGameNofiticationMessage {
  const { type, id } = message

  return type === MessageTypes.Notification && id === NotificationTypes.StartGame
}

export function isJoinGameNotificationMessage (message: any): message is JoinGameNotificationMessage {
  const { type, id } = message

  return type === MessageTypes.Notification && id === NotificationTypes.JoinGame
}

export function isShootResponseMessage (message: any): message is ShootResponseMessage {
  const { type, id } = message

  return type === MessageTypes.Response && id === ResponseTypes.Shoot
}

export function isDeployMineResponseMessage (message: any): message is DeployMineResponseMessage {
  const { type, id } = message

  return type === MessageTypes.Response && id === ResponseTypes.DeployMine
}

export function isPlayerHitNotificationMessage (message: any): message is PlayerHitNotificationMessage {
  const { type, id } = message

  return type === MessageTypes.Notification && id === NotificationTypes.Hit
}
