
const express = require('express');

const Users = require('../models/user');
const Questions = require('../models/questions');

const router = express.Router();

// router.get('/', (req, res, next) => {
// 	Questions.find()
// 		.then(results => {
// 			res.json(results);
// 		})
// 		.catch(err => {
// 			next(err);
// 		});
// });

router.get('/:username', (req, res, next) => {
	const {username} = req.params;
	Users.findOne({'username': username})
		.select('questions.head')
		.then(result => {
			const { head } = result.questions;
			return Questions.findById({_id: head})
				.select('prompt');
		})
		.then(prompt => {
			console.log('PROMPT', prompt);
			res.json(prompt);
		})
		.catch(err => {
			next(err);
		});
});

router.get('/correct/:username', (req, res, next) => {
	const {username} = req.params;
	const {answer} = req.body;
	Users.findOne({'username': username})
		.select('questions.head')
		.then(result => {
			const { head } = result.questions;
			return Questions.findById({_id: head})
				.select('answer');
		})
		.then( question => {
			if(question.answer === answer) {
				res.json(true);
			} else {
				res.json(false);
			}
		})
		.catch(err => {
			next(err);
		});
});


router.get('/next/:username', (req,res, next) => {
	const {username} = req.params;
	const {correct} = req.body;

	let nodeList;

	let answered;
	let answeredIndex;
	let nextQuestionIndex;

	let user; //need reference to user for 'save'

	Users.findOne({'username': username})
		.then(result => {
			user = result;
			const {head, list} = user.questions;
			nodeList = list;
			// get the current head from our array of nodes
			return nodeList.find((node, index) => {
				if(node.qid === head) {
					answeredIndex = index;
					return true;
				}
			});
		})
		.then(current => {

			// update it's m value
			answered = current;
			nextQuestionIndex = answered.next;
			answered.m = correct ? answered.m * 2 : 1;

			// save it's m value to find correct placement
			let m_position = answered.m;

			// find the insertion point for our 'node'
			while(m_position >= 1 && current.next <= nodeList.length) {
				current = nodeList[current.next];
				m_position--;
			}

			// set the new head to be the next question qid
			user.questions.head = nodeList[nextQuestionIndex].qid;

			// update 'next' pointers for insertion
			answered.next = current.next;
			current.next = answeredIndex;

			/**
			 *
			 * 	[ a, b, c, d, e ]
			 *    1  2  3  4  0
			 *
			 *   a -> b -> c -> d -> e
			 *
			 *  [ a, b, c, d, e ]
			 *    3  2  0  4  0
			 *
			 *  b -> c -> a -> d -> e
			 *
			 *  Example List:
			 *
			 *  a -> b -> c -> d -> e
			 *  1    1    1    1    1
			 *
			 *  'a' is correctly answered, so increase m value to 2...
			 *
		     *  'b' is the next head, and insert 'a' after 'c'
			 *  b -> c -> a -> d -> e
			 *  1    1    2    1    1
			 *
			 */

			return user.save( function(err, updatedUser) {
				if(err) {
					next(err);
				}
				console.log(updatedUser);
			});
		})
		.catch(err => {
			next(err);
		});

});

module.exports = router;



