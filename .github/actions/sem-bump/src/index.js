const { setFailed, getInput, debug } = require( '@actions/core' );
const { context, getOctokit } = require( '@actions/github' );

( async function main() {
	debug( 'Our action is running' );

	const token = getInput( 'github_token' );
	if ( ! token ) {
		setFailed( 'Input `github_token` is required' );
		return;
	}

	// Get the Octokit client.
	const octokit = new getOctokit( token );

	// Get info about the event.
	const { payload, eventName } = context;

	debug( `Received event = '${ eventName }', action = '${ payload.action }'` );

	// We only want to proceed if this is a newly opened issue.
	if ( eventName === 'issues' && payload.action === 'opened' ) {
		// Extra data from the event, to use in API requests.
		const { issue: { number }, repository: { owner, name } } = payload;

		// List of labels to add to the issue.
		const labels = [ 'Issue triaged' ];

		debug(
			`Add the following labels to issue #${ number }: ${ labels
				.map( ( label ) => `"${ label }"` )
				.join( ', ' ) }`
		);

		// Finally make the API request.
		await octokit.rest.issues.addLabels( {
			owner: owner.login,
			repo: name,
			issue_number: number,
			labels,
		} );
	}
} )();