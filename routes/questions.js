
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
	console.log('WERE IN!');
	const {answer} = req.query;
	const {username} = req.params;
	console.log(username, answer);
	Users.findOne({'username': username})
		.select('questions.head')
		.then(result => {
			const { head } = result.questions;
			return Questions.findById({_id: head})
				.select('answer');
		})
		.then( question => {
			if(question.answer === answer.toLowerCase()) {
				res.json(true);
			} else {
				res.json(false);
			}
		})
		.catch(err => {
			next(err);
		});
});

router.put('/next/:username', (req,res, next) => {
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
			return nodeList.filter((node) => {
				if(node.qid.toString() === head.toString()) {
					return node;
				}
			});
		})
		.then(node => {

			// console.log('NODE', node[0]);
			// update it's m value
			let current = node[0];
			answered = current;
			nextQuestionIndex = answered.next;
			answered.m = correct ? answered.m * 2 : 1;

			//console.log('M_VALUE',typeof(answered.m));

			// save it's m value to find correct placement
			let m_position = answered.m;

			console.log(m_position);
			//console.log('NODE INSERT POSITION', m_position);

			// find the insertion point for our 'node'
			while(m_position >= 1 && current.next <= nodeList.length) {
				current = nodeList[current.next];
				console.log('new current', current);
				m_position--;
			}

			console.log('we be looped!');
			// set the new head to be the next question qid
			user.questions.head = nodeList[nextQuestionIndex].qid;

			// update 'next' pointers for insertion
			console.log('answered.next before', answered.next);
			answered.next = current.next;
			console.log('answered.next after:', answered.next);
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
				res.json(updatedUser.head);
				if(err) {
					next(err);
				}
			});
		})
		.catch(err => {
			next(err);
		});

});

module.exports = router;
