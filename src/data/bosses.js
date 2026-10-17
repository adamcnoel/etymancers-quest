const BOSSES = [
    {
        id: 'gorgon-garbled-roots',
        name: 'Gorgon of Garbled Roots',
        threat: 1,
        hp: 95,
        hit: 14,
        mechanic: 'Petrifying Gaze',
        mechanicText: 'Miss a term and it returns on the next exchange until you answer it correctly.',
        intro: 'Look again. Stone remembers what you forget.',
        correctLines: ['A crack in the stone.', 'You remembered. For now.'],
        missLines: ['Again.', 'You will look at it until you know it.']
    },
    {
        id: 'warden-lost-meanings',
        name: 'Warden of Lost Meanings',
        threat: 2,
        hp: 135,
        hit: 18,
        mechanic: 'Weakest Link',
        mechanicText: 'Targets New, Learning, and recently missed material first.',
        intro: 'We will begin with what you do not know.',
        correctLines: ['Adequate.', 'One weakness corrected.'],
        missLines: ['As expected.', 'Your weakest answer remains exposed.']
    },
    {
        id: 'babbling-wyrm',
        name: 'The Babbling Wyrm',
        threat: 3,
        hp: 180,
        hit: 23,
        mechanic: 'Ceaseless Babble',
        mechanicText: 'Your HP drains by 1 every 2 seconds while a question waits for an answer.',
        intro: 'Answer, answer, answer—before my words wear you down!',
        correctLines: ['Yes! Next word, next word!', 'Quickly now—another!'],
        missLines: ['Too slow, too wrong, too late!', 'The babble gets louder.']
    },
    {
        id: 'etymophage',
        name: 'Etymophage',
        threat: 4,
        hp: 235,
        hit: 29,
        mechanic: 'Feeds on Failure',
        mechanicText: 'A wrong answer restores 18 HP to the Etymophage, up to its maximum.',
        intro: 'Every mistake tastes better than the last.',
        correctLines: ['Bitter.', 'That one gave me nothing.'],
        missLines: ['Delicious.', 'Feed me another mistake.']
    },
    {
        id: 'null-scribe',
        name: 'The Null Scribe',
        threat: 5,
        hp: 290,
        hit: 36,
        mechanic: 'Null Field',
        mechanicText: 'Channel is disabled. Every hit must come from an ordinary cast.',
        intro: 'No amplification. No shortcut. Write the answer correctly.',
        correctLines: ['Accepted.', 'The mark remains.'],
        missLines: ['Erased.', 'Incorrect. Begin again.']
    },
    {
        id: 'lexivore',
        name: 'Lexivore',
        threat: 6,
        hp: 390,
        hit: 46,
        mechanic: 'No Tricks. No Mercy.',
        mechanicText: 'A massive health pool and brutal counterattacks. Nothing else.',
        intro: 'No tricks. No mercy. Show me how long you can last.',
        correctLines: ['Still standing?', 'Again.'],
        missLines: ['That hurt.', 'You cannot afford many of those.']
    }
];
