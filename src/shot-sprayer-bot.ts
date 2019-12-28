import chalk from 'chalk'

import {
  BotAPI,
  SuccessfulRegisterPlayerResponse,
  FailedRegisterPlayerResponse,
  SuccessfulMovePlayerResponse,
  FailedMovePlayerResponse,
  SuccessfulRotatePlayerResponse,
  FailedRotatePlayerResponse,
  SuccessfulShootResponse,
  FailedShootResponse,
  Position,
  Rotation
} from './types'
import {
  ActionTypes,
  Action,
  ShootAction,
  rotateAction,
  moveForwardAction
} from './actions'
import { calculateAngleBetweenPoints } from './utils'

enum Status {
  Unregistered,
  NotStarted,
  RotatedToArenaCenter,
  MovingToArenaCenter,
  Rotating,
  Shooting,
  Stop
}

type StatusData<S> =
  S extends Status.RotatedToArenaCenter ? { status: Status.RotatedToArenaCenter, statusData: { rotationToArenaCenter: number } } :
  S extends Status.Unregistered ? { status: Status.Unregistered } :
  S extends Status.NotStarted ? { status: Status.NotStarted } :
  S extends Status.MovingToArenaCenter ? { status: Status.MovingToArenaCenter } :
  S extends Status.Rotating ? { status: Status.Rotating, statusData: { ticksToNextRotation: number } } :
  S extends Status.Shooting ? { status: Status.Shooting, statusData: { shotsFired: number } } :
  S extends Status.Stop ? { status: Status.Stop } :
  never

type State<S extends Status> = { position: Position, rotation: Rotation } & StatusData<S>

function shootAction (): ShootAction {
  return { type: ActionTypes.Shoot }
}

/*
 * I would like to specify the type of the bot
 * to be BotAPI<State<Status>> to say that the api methods
 * have to take a State<Status> but be able to refine
 * it in each individual method to the enum keys relevant
 * to that method. But it doesn't work. With BotAPI<State<Status>>
 * the compiler complains that for example Status.RotateToCircle can't
 * be assigned to Status.Unregistered (in the registerPlayerResponse method)
 */
export const bot: BotAPI<any> = {
  handlers: {
    registerPlayerResponse: (
      data: FailedRegisterPlayerResponse | SuccessfulRegisterPlayerResponse,
      state: State<Status.Unregistered>
    ): { state: State<Status.NotStarted | Status.Unregistered>, actions: Action[] } => {
      console.log(chalk.cyan('RegisterPlayerResponse'))
      if (!data.success) {
        return { state, actions: [] }
      }

      if (data.success) {
        const botState: State<Status.NotStarted> = {
          // TODO read the real rotation
          status: Status.NotStarted,
          rotation: 0,
          position: data.data.position
        }

        return { state: botState, actions: [] }
      }

      throw new Error('not possible')
    },

    movePlayerResponse: (
      data: SuccessfulMovePlayerResponse | FailedMovePlayerResponse,
      state: State<Status.MovingToArenaCenter>
    ): { state: State<Status.MovingToArenaCenter | Status.Stop | Status.Rotating>, actions: Action[] } => {
      console.log(chalk.cyan('MovePlayerResponse'))
      if (!data.success) {
        return {
          state: {
            ...state,
            status: Status.Stop
          },
          actions: []
        }
      }

      if (state.status === Status.MovingToArenaCenter) {
        // TODO remove the hardcoded values for the arena center
        const xDelta = Math.abs(data.data.position.x - 250)
        const yDelta = Math.abs(data.data.position.y - 250)

        if (xDelta < 5 && yDelta < 5) {
          const rotation = (state.rotation + 5) % 360
          return {
            state: {
              ...state,
              status: Status.Rotating,
              statusData: {
                ticksToNextRotation: 10
              },
              rotation,
              position: data.data.position
            },
            actions: [rotateAction(rotation)]
          }
        } else {
          return {
            state,
            actions: [moveForwardAction()]
          }
        }
      }

      throw new Error('not possible')
    },

    rotatePlayerResponse: (
      data: SuccessfulRotatePlayerResponse | FailedRotatePlayerResponse,
      state: State<Status.RotatedToArenaCenter | Status.Rotating>
    ): { state: State<Status.MovingToArenaCenter | Status.Rotating | Status.Stop | Status.Shooting>, actions: Action[] } => {
      console.log(chalk.cyan('RotatePlayerResponse'))
      if (!data.success) {
        return {
          state: {
            ...state,
            status: Status.Stop
          },
          actions: []
        }
      }

      if (state.status === Status.Rotating) {
        return {
          state: {
            ...state,
            status: Status.Shooting,
            statusData: {
              shotsFired: 0
            }
          },
          actions: [shootAction()]
        }
      }

      return {
        state: {
          ...state,
          status: Status.MovingToArenaCenter
        },
        actions: [moveForwardAction()]
      }
    },

    shootResponse: (
      data: SuccessfulShootResponse | FailedShootResponse,
      state: State<Status.Shooting>
    ): { state: State<Status.Shooting | Status.Rotating | Status.Stop>, actions: Action[] } => {
      console.log(chalk.cyan('ShootResponse'))

      if (!data.success) {
        // Most likely the request was not a success because the
        // bot run out of shots. So ignore it and continue shooting
        return {
          state,
          actions: [shootAction()]
        }
      }

      if (state.statusData.shotsFired === 1) {
        const rotation = state.rotation + 15

        return {
          state: {
            ...state,
            status: Status.Rotating,
            rotation,
            statusData: {
              ticksToNextRotation: 5
            }
          },
          actions: [rotateAction(rotation)]
        }
      } else {
        const shotsFired = state.statusData.shotsFired + 1

        return {
          state: {
            ...state,
            statusData: {
              shotsFired
            }
          },
          actions: [shootAction()]
        }
      }
    },

    radarScanNotification: (
      _scan: {
        players: { position: Position }[],
        shots: { position: Position }[],
        unknown: { position: Position }[]
      },
      state: State<Status.Rotating>
    ): { state: State<Status>, actions: Action[] } => {
      console.log(chalk.cyan('RadarScanNotification'))
      if (state.status === Status.Rotating) {
        if (state.statusData.ticksToNextRotation === 0) {
          const rotation = (state.rotation + 15) % 360
          return {
            state: {
              ...state,
              rotation,
              statusData: {
                ticksToNextRotation: 5
              }
            },
            actions: [rotateAction(rotation)]
          }
        } else {
          const ticksToNextRotation = state.statusData.ticksToNextRotation - 1

          return {
            state: {
              ...state,
              statusData: {
                ticksToNextRotation
              }
            },
            actions: []
          }
        }
      } else {
        return { state, actions: [] }
      }
    },

    startGameNotification: (
      state: State<Status.NotStarted>
    ): { state: State<Status.RotatedToArenaCenter>, actions: Action[] } => {
      console.log(chalk.cyan('StartGameNotification'))
      const rotationToArenaCenter = calculateAngleBetweenPoints(state.position, { x: 250, y: 250 })

      return {
        state: {
          status: Status.RotatedToArenaCenter,
          statusData: {
            rotationToArenaCenter
          },
          rotation: rotationToArenaCenter,
          position: state.position
        },
        actions: [rotateAction(rotationToArenaCenter)]
      }
    },

    joinGameNotification: (
      state: State<Status.NotStarted>
    ): { state: State<Status.RotatedToArenaCenter>, actions: Action[] } => {
      console.log(chalk.cyan('JoinGameNotification'))
      const rotationToArenaCenter = calculateAngleBetweenPoints(state.position, { x: 250, y: 250 })

      return {
        state: {
          status: Status.RotatedToArenaCenter,
          statusData: {
            rotationToArenaCenter
          },
          rotation: state.rotation,
          position: state.position
        },
        actions: [rotateAction(rotationToArenaCenter)]
      }
    }
  }
}

