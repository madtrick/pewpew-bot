import * as fs from 'fs'
import * as path from 'path'
import WebSocket from 'ws'
import * as _ from 'lodash'
import yargs from 'yargs'
import Planner from './src/planner'
import Oracle from './src/oracle'
import Gunner from './src/gunner'
import {
  ActionTypes,
  Bot,
  Rotation,
  MovementDirection,
  MessageTypes,
  NotificationTypes,
  ResponseTypes,
  RequestTypes,
  Message,
  RegisterPlayerRequestMessage,
  RegisterPlayerResponseMessage,
  MovePlayerRequestMessage,
  MovePlayerResponseMessage,
  RotatePlayerRequestMessage,
  RotatePlayerResponseMessage,
  RadarScanNotificationMessage,
  ShootRequestMessage,
  StartGameNofiticationMessage
} from './src/types'
import { ARENA_HEIGHT, ARENA_WIDTH } from './src/constants'


interface State {
  bot?: Bot
  oracle?: Oracle
}

const ws = new WebSocket('ws://localhost:8080')
const gunner = new Gunner()
const argv = yargs.demand(['i']).argv
const messagesLogPath = path.join(__dirname, argv.i + '-messages.log')
let lastMovementConfirmed = false

function move (ws: WebSocket, direction: MovementDirection): void {
  const data: MovePlayerRequestMessage = {
    sys: {
      type: MessageTypes.Request,
      id: RequestTypes.MovePlayer
    },
    data: {
      movement: {
        direction: direction
      }
    }
  }

  writeMessagesToFile('send', data)

  ws.send(JSON.stringify(data))
}

function rotate (ws: WebSocket, rotation: Rotation): void {
  const data: RotatePlayerRequestMessage = {
    sys: {
      type: MessageTypes.Request,
      id: RequestTypes.RotatePlayer
    },
    data: {
      rotation
    }
  }

  writeMessagesToFile('send', data)

  ws.send(JSON.stringify(data))
}

function shoot (ws: WebSocket): void {
  const data: ShootRequestMessage = {
    sys: {
      type: MessageTypes.Request,
      id: RequestTypes.Shoot
    }
  }

  writeMessagesToFile('send', data)

  ws.send(JSON.stringify(data))
}

function isRegisterPlayerResponseMessage (message: any): message is RegisterPlayerResponseMessage {
  const { sys: { type, id } } = message

  return type === MessageTypes.Response && id === ResponseTypes.RegisterPlayer
}

function isMovePlayerResponseMessage (message: any): message is MovePlayerResponseMessage {
  const { sys: { type, id } } = message

  return type === MessageTypes.Response && id === ResponseTypes.MovePlayer
}

function isRotatePlayerResponseMessage (message: any): message is RotatePlayerResponseMessage {
  const { sys: { type, id } } = message

  return type === MessageTypes.Response && id === 'ComponentUpdate'
}

function isRadarScanNotificationMessage (message: any): message is RadarScanNotificationMessage {
  const { sys: { type, id } } = message

  return type === MessageTypes.Notification && id === NotificationTypes.RadarScan
}

function isStartGameNotificationMessage (message: any): message is StartGameNofiticationMessage {
  const { sys: { type, id } } = message

  return type === MessageTypes.Notification && id === NotificationTypes.StartGame
}

function analyzeMessage (ws: WebSocket, message: any, state: State): State {
  const data = message.data

  if (isRegisterPlayerResponseMessage(message)) {
    const { position, rotation } = message.details

    state.bot = {
      planner: new Planner({
        tracker: argv.t as boolean,
        direction: MovementDirection.Forward,
        position,
        rotation,
        arena: {
          width: ARENA_WIDTH,
          height: ARENA_HEIGHT
        }
      }),
      location: position,
      rotation
    }

    state.oracle = new Oracle({ shooter: argv.s as boolean })
  }

  if (isMovePlayerResponseMessage(message)) {
    lastMovementConfirmed = true
    const { position } = message.details
    state.bot!.planner.locations.current = position
    state.bot!.location = position
  }

  if (isRotatePlayerResponseMessage(message)) {
    // TODO
  }

  if (isRadarScanNotificationMessage(message)) {
    if (lastMovementConfirmed) {
      const action = state.oracle!.decide(state.bot!, data, state.bot!.planner, gunner)

      if (action.type === ActionTypes.Move) {
        move(ws, action.data.direction)
        lastMovementConfirmed = false
      }

      if (action.type === ActionTypes.Rotate) {
        rotate(ws, action.data.rotation)
      }

      if (action.type === ActionTypes.Shoot) {
        shoot(ws)
      }
    }
  }

  if (isStartGameNotificationMessage(message)) {
    move(ws, MovementDirection.Forward)
  }

  console.log('unexpected message')
  console.dir(message, { colors: true, depth: null })
  lastMovementConfirmed = true // reset

  return state
}

function orderMessages (messages: Message[]): Message[] {
  const order = ['MovePlayerAck', 'RadarScanNotification']

  return messages.sort((messageA, messageB) => {
    const indexA = order.indexOf(messageA.type)
    const indexB = order.indexOf(messageB.type)

    if (indexA && indexB) {
      return indexA - indexB
    }

    if (indexA || indexB) {
      return -1
    }

    return 0
  })
}

function analyzeMessages (ws: WebSocket, messages: Message[], state: State): State {
  return messages.reduce((s, message) => {
    return analyzeMessage(ws, message, s)
  }, state)
}

ws.on('open', function open (): void {
  truncateMessagesFile()

  const message: RegisterPlayerRequestMessage = {
    sys: {
      type: MessageTypes.Request,
      id: RequestTypes.RegisterPlayer
    },
    data: {
      id: `${Date.now()}`
    }
  }

  ws.send(JSON.stringify(message), { mask: true })

  let state: State = {}
  ws.on('message', function handleMessage (json: string): void {
    const messages = JSON.parse(json)

    writeMessagesToFile('recv', messages)
    state = analyzeMessages(ws, orderMessages(messages), state)
  })
})

ws.on('close', function close (): void {
  console.log('Connection closed')
  process.exit(0)
})

function truncateMessagesFile (): void {
  if (fs.existsSync(messagesLogPath)) {
    fs.truncateSync(messagesLogPath)
  }
}

function writeMessagesToFile (prefix: string, messages: any): void {
  const data = '[' + prefix + ']' + JSON.stringify(messages) + '\n'

  fs.appendFileSync(messagesLogPath, data)
}
