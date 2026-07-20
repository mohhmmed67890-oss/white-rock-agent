const publishParams = new URLSearchParams();
      publishParams.append("creation_id", createData.id);
      publishParams.append("access_token", token);

      const publishRes = await fetch(`https://graph.instagram.com/v21.0/${igUserId}/media_publish`, {
        method: "POST",
        body: publishParams,
      });
      const publishData = await publishRes.json();
