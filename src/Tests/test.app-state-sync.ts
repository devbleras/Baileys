import { AccountSettings, ChatMutation, Contact, InitialAppStateSyncOptions } from '../Types'
import { unixTimestampSeconds } from '../Utils'
import { processSyncAction } from '../Utils/chat-utils'
import logger from '../Utils/logger'
import { makeEventBuffer } from '../Utils'
import { randomJid } from './utils'

describe('App State Sync Tests', () => {

       const me: Contact = { id: randomJid() }
       let ev: ReturnType<typeof makeEventBuffer>

       beforeEach(() => {
               const _logger = logger.child({})
               _logger.level = 'trace'
               ev = makeEventBuffer(_logger)
       })
	// case when initial sync is off
	it('should return archive=false event', () => {
		const jid = randomJid()
		const index = ['archive', jid]

		const CASES: ChatMutation[][] = [
			[
				{
					index,
					syncAction: {
						value: {
							archiveChatAction: {
								archived: false,
								messageRange: {
									lastMessageTimestamp: unixTimestampSeconds()
								}
							}
						}
					}
				}
			],
			[
				{
					index,
					syncAction: {
						value: {
							archiveChatAction: {
								archived: true,
								messageRange: {
									lastMessageTimestamp: unixTimestampSeconds()
								}
							}
						}
					}
				},
				{
					index,
					syncAction: {
						value: {
							archiveChatAction: {
								archived: false,
								messageRange: {
									lastMessageTimestamp: unixTimestampSeconds()
								}
							}
						}
					}
				}
			]
		]

               for(const mutations of CASES) {
                       const updates: any[] = []
                       ev.on('chats.update', u => updates.push(...u))

                       for(const mutation of mutations) {
                               processSyncAction(mutation, ev, me, undefined, logger)
                       }

                       expect(updates.length).toBeGreaterThan(0)
                       expect(updates[updates.length - 1].archived).toEqual(false)

                       ev.removeAllListeners('chats.update')
               }
	})
	// case when initial sync is on
	// and unarchiveChats = true
	it('should not fire any archive event', () => {
		const jid = randomJid()
		const index = ['archive', jid]
		const now = unixTimestampSeconds()

		const CASES: ChatMutation[][] = [
			[
				{
					index,
					syncAction: {
						value: {
							archiveChatAction: {
								archived: true,
								messageRange: {
									lastMessageTimestamp: now - 1
								}
							}
						}
					}
				}
			],
			[
				{
					index,
					syncAction: {
						value: {
							archiveChatAction: {
								archived: false,
								messageRange: {
									lastMessageTimestamp: now + 10
								}
							}
						}
					}
				}
			],
			[
				{
					index,
					syncAction: {
						value: {
							archiveChatAction: {
								archived: true,
								messageRange: {
									lastMessageTimestamp: now + 10
								}
							}
						}
					}
				},
				{
					index,
					syncAction: {
						value: {
							archiveChatAction: {
								archived: false,
								messageRange: {
									lastMessageTimestamp: now + 11
								}
							}
						}
					}
				}
			],
		]

               const ctx: InitialAppStateSyncOptions = {
                       accountSettings: { unarchiveChats: true }
               }

               for(const mutations of CASES) {
                       const updates: any[] = []
                       ev.on('chats.update', u => updates.push(...u))

                       for(const mutation of mutations) {
                               processSyncAction(mutation, ev, me, ctx, logger)
                       }

                       const expected = (mutations[mutations.length - 1].syncAction.value as any).archiveChatAction?.archived ?? false
                       expect(updates.length).toBeGreaterThan(0)
                       expect(updates[updates.length - 1].archived).toEqual(expected)

                       ev.removeAllListeners('chats.update')
               }
	})

	// case when initial sync is on
	// with unarchiveChats = true & unarchiveChats = false
	it('should fire archive=true events', () => {
		const jid = randomJid()
		const index = ['archive', jid]
		const now = unixTimestampSeconds()

		const CASES: { settings: AccountSettings, mutations: ChatMutation[] }[] = [
			{
				settings: { unarchiveChats: true },
				mutations: [
					{
						index,
						syncAction: {
							value: {
								archiveChatAction: {
									archived: true,
									messageRange: {
										lastMessageTimestamp: now
									}
								}
							}
						}
					}
				],
			},
			{
				settings: { unarchiveChats: false },
				mutations: [
					{
						index,
						syncAction: {
							value: {
								archiveChatAction: {
									archived: true,
									messageRange: {
										lastMessageTimestamp: now - 10
									}
								}
							}
						}
					}
				],
			}
		]

               for(const { mutations, settings } of CASES) {
                       const ctx: InitialAppStateSyncOptions = {
                               accountSettings: settings
                       }
                       const updates: any[] = []
                       ev.on('chats.update', u => updates.push(...u))

                       for(const mutation of mutations) {
                               processSyncAction(mutation, ev, me, ctx, logger)
                       }

                       const expected = (mutations[mutations.length - 1].syncAction.value as any).archiveChatAction?.archived ?? false
                       expect(updates.length).toBeGreaterThan(0)
                       expect(updates[updates.length - 1].archived).toEqual(expected)

                       ev.removeAllListeners('chats.update')
               }
	})
})
