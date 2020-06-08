import React from "react";
import ReactDOM from "react-dom";
import queryString from "query-string";

const clientId = 33018;
const API_KEY = "812d8bcbb3fd459cb3be5209392ce3bc";
const AUTH_URL = `https://www.bungie.net/en/OAuth/Authorize?client_id=${clientId}&response_type=code`;
const AUTH_HEADER =
  "Basic MzMwMTg6V0pIZzFlWE43Z2EtQ1ZDQ001Tm5oZUVBTXg4TVU0cmZXc2o3c0Y1TG9Odw==";

function fetchJson(...args) {
  return fetch(...args).then((r) => r.json());
}

function withHeaders(apiKey, accessToken) {
  return {
    headers: {
      "x-api-key": apiKey,
      Authorization: `Bearer ${accessToken}`,
    },
  };
}

function Debug() {
  const queryParams = queryString.parse(location.search);
  const [authData, setAuthData] = React.useState();
  const [authError, setAuthError] = React.useState();
  const [linkedProfiles, setLinkedProfiles] = React.useState();
  const [selectedMembership, setSelectedMembership] = React.useState();
  const [profileData, setProfileData] = React.useState();
  const isLoggedIn = !!authData;

  React.useEffect(() => {
    const authFromLs = JSON.parse(localStorage.getItem("debug-auth") || "{}");

    if (!authFromLs.access_token) {
      return;
    }

    authFromLs.accessTokenExpiresDate = new Date(
      authFromLs.accessTokenExpiresDate
    );
    authFromLs.refreshTokenExpiresDate = new Date(
      authFromLs.refreshTokenExpiresDate
    );

    const now = new Date();

    if (authFromLs.accessTokenExpiresDate > now) {
      setAuthData(authFromLs);
      return;
    }

    if (authFromLs.refreshTokenExpiresDate > now) {
      fetchJson("https://www.bungie.net/Platform/App/OAuth/Token/", {
        method: "post",
        body: `grant_type=refresh_token&refresh_token=${authFromLs.refresh_token}`,
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          Authorization: AUTH_HEADER,
        },
      }).then((newAuthData) => {
        if (newAuthData.access_token) {
          const now = new Date();

          newAuthData.accessTokenExpiresDate = new Date().setSeconds(
            now.getSeconds() + newAuthData.expires_in
          );
          newAuthData.refreshTokenExpiresDate = new Date().setSeconds(
            now.getSeconds() + newAuthData.refresh_expires_in
          );

          setAuthData(newAuthData);

          localStorage.setItem("debug-auth", JSON.stringify(newAuthData));
        } else if (newAuthData.error_description) {
          setAuthError(newAuthData.error_description);
        }
      });
    }
  }, []);

  React.useEffect(() => {
    if (!queryParams.code) {
      return;
    }

    fetchJson("https://www.bungie.net/Platform/App/OAuth/Token/", {
      method: "post",
      body: `grant_type=authorization_code&code=${queryParams.code}`,
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        Authorization: AUTH_HEADER,
      },
    }).then((newAuthData) => {
      if (newAuthData.access_token) {
        const now = new Date();

        newAuthData.accessTokenExpiresDate = new Date().setSeconds(
          now.getSeconds() + newAuthData.expires_in
        );
        newAuthData.refreshTokenExpiresDate = new Date().setSeconds(
          now.getSeconds() + newAuthData.refresh_expires_in
        );

        setAuthData(newAuthData);

        localStorage.setItem("debug-auth", JSON.stringify(newAuthData));
      } else if (newAuthData.error_description) {
        setAuthError(newAuthData.error_description);
      }
    });
  }, [queryParams.code]);

  React.useEffect(() => {
    if (!authData) {
      return;
    }

    var uri = window.location.toString();
    if (uri.indexOf("?") > 0) {
      var clean_uri = uri.substring(0, uri.indexOf("?"));
      window.history.replaceState({}, document.title, clean_uri);
    }

    fetchJson(
      `https://www.bungie.net/Platform/Destiny2/254/Profile/${authData.membership_id}/LinkedProfiles/?getAllMemberships=true`,
      withHeaders(API_KEY, authData.access_token)
    )
      .then((data) => {
        setLinkedProfiles(data);

        const memberships = [...data.Response.profiles];
        memberships.sort(
          (a, b) => new Date(a.dateLastPlayed) - new Date(b.dateLastPlayed)
        );

        const membership = memberships[0];
        setSelectedMembership(membership);

        console.log("selected membership", membership);

        return fetchJson(
          `https://www.bungie.net/Platform/Destiny2/${membership.membershipType}/Profile/${membership.membershipId}/?components=Profiles,ProfileInventories,Characters,CharacterInventories,CharacterEquipment,ItemInstances,ItemObjectives,Records,CharacterActivities`,
          withHeaders(API_KEY, authData.access_token)
        );
      })
      .then((data) => {
        setProfileData(data);
      });
  }, [authData]);

  return (
    <div className="debug-page">
      <section style={{ opacity: isLoggedIn ? 0.5 : 1 }}>
        <h2>Authenticate your Bungie account</h2>
        <br />
        <a className="download-button" href={AUTH_URL}>
          Login with Bungie
        </a>

        {authError && (
          <p className="error">
            Error authenticating: <code>{authError}</code>
          </p>
        )}

        {/* {authData && (
          <>
            <p>
              This auth data is highly sensitive and gives access to your
              account for up to 80 days. Treat it as your password because it
              essentially is.
            </p>
            <textarea value={JSON.stringify(authData, null, 2)} />
          </>
        )} */}
      </section>

      {linkedProfiles && (
        <section>
          <h2>LinkedProfiles</h2>
          <p>
            <textarea value={JSON.stringify(linkedProfiles, null, 2)} />
          </p>
        </section>
      )}

      {(profileData || selectedMembership) && (
        <section>
          <h2>GetProfile</h2>
          {selectedMembership && (
            <p>
              Requested{" "}
              <code>
                {selectedMembership.membershipType}/
                {selectedMembership.membershipId}
              </code>
            </p>
          )}
          {profileData && (
            <textarea value={JSON.stringify(profileData, null, 2)} />
          )}
        </section>
      )}

      <section>
        <p>
          If asked, copy and paste the contents of a text box and upload to{" "}
          <a className="link" href="https://gist.github.com">
            gist.github.com
          </a>
        </p>
      </section>
    </div>
  );
}

ReactDOM.render(<Debug />, document.getElementById("react-root"));
